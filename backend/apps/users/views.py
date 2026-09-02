from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
import logging
import threading
from rest_framework import generics, parsers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import PasswordResetToken, Profile, SurveyResponse
from .permissions import IsAdmin
from .serializers import (
    RegisterSerializer,
    MeSerializer,
    UserSerializer,
    InstructorCreateSerializer,
    AdminStudentCreateSerializer,
    AdminUserSerializer,
    ChangePasswordSerializer,
    SurveyResponseSerializer,
)
from .throttles import AuthRateThrottle

User = get_user_model()


# ---------------------------------------------------------------------------
# Auth endpoints (public)
# ---------------------------------------------------------------------------

class SecureLoginView(TokenObtainPairView):
    """Login con rate limiting y bloqueo de cuenta por intentos fallidos."""
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')

        # Usar select_for_update para evitar race conditions en el contador de intentos
        with transaction.atomic():
            user = User.objects.select_for_update().filter(email=email).first()

            if user:
                # Verificar si la cuenta está bloqueada
                if user.is_locked:
                    remaining = user.get_lockout_remaining_minutes()
                    return Response({
                        'error': 'account_locked',
                        'message': f'Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en {remaining} minutos o contacta al administrador.',
                        'locked_until': user.locked_until.isoformat(),
                        'remaining_minutes': remaining,
                    }, status=status.HTTP_403_FORBIDDEN)

                # Si el bloqueo expiró, desbloquear automáticamente
                if user.locked_until and user.locked_until <= timezone.now():
                    user.reset_login_attempts()

        # Intentar login normal
        try:
            response = super().post(request, *args, **kwargs)
            # Login exitoso: resetear intentos y enriquecer respuesta con info de secciones
            if user and user.is_active:
                user.reset_login_attempts()

                try:
                    # Importar aquí para evitar dependencias circulares en tiempo de carga
                    from apps.sections.models import Section, SectionMembership

                    memberships = (
                        SectionMembership.objects.select_related('section')
                        .filter(user=user, is_active=True)
                    )

                    section_slugs = []
                    has_corporate = False
                    has_maily = False

                    for membership in memberships:
                        section = membership.section
                        if not section or not section.is_active:
                            continue
                        section_slugs.append(section.slug)
                        if section.section_type == Section.SectionType.CORPORATE:
                            has_corporate = True
                        elif section.section_type == Section.SectionType.MAILY:
                            has_maily = True

                    # Longevity 360 es público: todos los estudiantes tienen acceso
                    section_slugs.append('longevity-360')

                    # Prioridad para redirect: corporativo > maily > público (Longevity 360)
                    redirect_section = None
                    if has_corporate:
                        redirect_section = 'corporativo-camsa'
                    elif has_maily:
                        redirect_section = 'maily-academia'
                    else:
                        redirect_section = 'longevity-360'

                    # Eliminar duplicados y ordenar para estabilidad
                    section_slugs = sorted(set(section_slugs))

                    if isinstance(response.data, dict):
                        # Superusers y staff se exponen como 'admin' para el frontend
                        effective_role = 'admin' if (user.is_superuser or user.is_staff) else user.role
                        response.data['redirect_section'] = redirect_section
                        response.data['user'] = {
                            'id': user.id,
                            'email': user.email,
                            'role': effective_role,
                            'is_super_admin': getattr(user, 'is_super_admin', False),
                            'sections': section_slugs,
                        }
                except Exception:
                    # Si algo falla al calcular secciones, no romper el login
                    pass

            return response
        except Exception as e:
            # Login fallido: incrementar intentos si el usuario existe
            if user and user.is_active:
                with transaction.atomic():
                    # Re-lock el usuario para incremento atómico
                    locked_user = User.objects.select_for_update().filter(pk=user.pk).first()
                    if locked_user:
                        locked_user.increment_failed_attempts()
                        locked_user.refresh_from_db()

                        if locked_user.is_locked:
                            return Response({
                                'error': 'account_locked',
                                'message': f'Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en {locked_user.get_lockout_remaining_minutes()} minutos o contacta al administrador.',
                                'locked_until': locked_user.locked_until.isoformat(),
                                'remaining_minutes': locked_user.get_lockout_remaining_minutes(),
                            }, status=status.HTTP_403_FORBIDDEN)

                        remaining_attempts = User.MAX_LOGIN_ATTEMPTS - locked_user.failed_login_attempts
                        return Response({
                            'detail': 'Correo o contraseña incorrectos.',
                            'remaining_attempts': remaining_attempts,
                        }, status=status.HTTP_401_UNAUTHORIZED)

            # Usuario no existe o no está activo
            return Response({
                'detail': 'Correo o contraseña incorrectos.',
            }, status=status.HTTP_401_UNAUTHORIZED)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ – Register a new student."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ – View or update the current user's profile."""

    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AvatarUploadView(APIView):
    """PATCH /api/auth/me/avatar/ – Subir foto de perfil a Cloudinary y guardar URL."""

    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def patch(self, request):
        import os
        import tempfile
        import cloudinary
        import cloudinary.uploader

        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return Response({'detail': 'No se envió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
        if avatar_file.content_type not in allowed_types:
            return Response({'detail': 'Solo se permiten imágenes JPG, PNG o WebP.'}, status=status.HTTP_400_BAD_REQUEST)

        if avatar_file.size > 2 * 1024 * 1024:
            return Response({'detail': 'La imagen no puede superar 2 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cloudinary.config(cloudinary_url=os.environ.get('CLOUDINARY_URL'))
            suffix = os.path.splitext(getattr(avatar_file, 'name', ''))[1] or '.jpg'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                for chunk in avatar_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            try:
                result = cloudinary.uploader.upload(
                    tmp_path,
                    folder='avatars',
                    resource_type='image',
                    transformation=[{'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'}],
                )
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

            url = result.get('secure_url')
            if not url:
                return Response({'detail': 'Error al subir la imagen.'}, status=status.HTTP_502_BAD_GATEWAY)

            profile, _ = Profile.objects.get_or_create(user=request.user)
            profile.avatar = url
            profile.save(update_fields=['avatar'])

            return Response({'avatar': url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': f'Error al procesar la imagen: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SurveyView(APIView):
    """
    GET  /api/auth/survey/  – obtener encuesta del usuario autenticado.
    POST /api/auth/survey/  – crear/actualizar encuesta y marcar perfil como completado.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            survey = SurveyResponse.objects.get(user=request.user)
        except SurveyResponse.DoesNotExist:
            return Response(
                {'detail': 'La encuesta no ha sido completada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = SurveyResponseSerializer(survey)
        return Response(serializer.data)

    def post(self, request):
        try:
            instance = SurveyResponse.objects.get(user=request.user)
            partial = True
        except SurveyResponse.DoesNotExist:
            instance = None
            partial = False

        serializer = SurveyResponseSerializer(
            instance=instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        survey = serializer.save(user=request.user)

        # Marcar el perfil como que ya completó la encuesta y sincronizar ocupación
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if survey.occupation_type and profile.occupation_type != survey.occupation_type:
            profile.occupation_type = survey.occupation_type
        if not profile.has_completed_survey:
            profile.has_completed_survey = True
        profile.save(update_fields=['occupation_type', 'has_completed_survey'])

        status_code = status.HTTP_200_OK if instance else status.HTTP_201_CREATED
        return Response(SurveyResponseSerializer(survey).data, status=status_code)


# ---------------------------------------------------------------------------
# Admin-only user management
# ---------------------------------------------------------------------------

class UserListView(generics.ListAPIView):
    """GET /api/users/ – List all users (admin only)."""

    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'username']


class InstructorCreateView(generics.CreateAPIView):
    """POST /api/users/instructors/ – Create a new instructor (admin only)."""

    serializer_class = InstructorCreateSerializer
    permission_classes = [IsAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class StudentCreateView(generics.CreateAPIView):
    """POST /api/users/students/ – Create a new student and assign sections (admin only)."""

    serializer_class = AdminStudentCreateSerializer
    permission_classes = [IsAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            AdminUserSerializer(user, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/users/{id}/ – Manage a user (admin only).

    DELETE performs a soft-delete by setting is_active=False.
    """

    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class AdminChangePasswordView(APIView):
    """POST /api/users/{id}/change-password/ – Cambiar contraseña de usuario (admin only)."""
    
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'message': 'Contraseña actualizada correctamente.',
            'user_id': user.id,
            'user_email': user.email,
        }, status=status.HTTP_200_OK)


class AdminUnlockAccountView(APIView):
    """POST /api/users/{id}/unlock/ – Desbloquear cuenta de usuario (admin only)."""
    
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        
        if not user.is_locked and user.failed_login_attempts == 0:
            return Response({
                'message': 'La cuenta no está bloqueada.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.reset_login_attempts()
        
        return Response({
            'message': 'Cuenta desbloqueada correctamente.',
            'user_id': user.id,
            'user_email': user.email,
        }, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Password Reset (public)
# ---------------------------------------------------------------------------

class RequestPasswordResetView(APIView):
    """POST /api/auth/password-reset/request/ – Solicitar recuperación de contraseña."""
    
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response({
                'error': 'El correo electrónico es requerido.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Siempre responder con éxito para no revelar si el email existe
        success_message = {
            'message': 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.',
        }
        
        user = User.objects.filter(email=email, is_active=True).first()
        
        if not user:
            return Response(success_message, status=status.HTTP_200_OK)
        
        # Invalidar tokens anteriores no usados
        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
        
        # Crear nuevo token
        token = PasswordResetToken.objects.create(user=user)
        
        # Construir URL de reset
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token.token}"
        
        # Enviar email
        subject = 'Recuperación de contraseña - Maily Academia'
        message = f"""
Hola {user.first_name or user.email},

Recibimos una solicitud para restablecer tu contraseña en Maily Academia.

Haz clic en el siguiente enlace para crear una nueva contraseña:
{reset_url}

Este enlace expirará en 1 hora.

Si no solicitaste este cambio, puedes ignorar este correo.

Saludos,
El equipo de Maily Academia
"""
        
        def _send_reset_email():
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                logging.getLogger(__name__).exception(
                    "Error enviando email de recuperación de contraseña: %s", e
                )
        
        # Enviar en segundo plano para no bloquear el worker (evita timeout con SMTP lento)
        thread = threading.Thread(target=_send_reset_email, daemon=True)
        thread.start()
        
        return Response(success_message, status=status.HTTP_200_OK)


class ConfirmPasswordResetView(APIView):
    """POST /api/auth/password-reset/confirm/ – Confirmar nueva contraseña."""
    
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')
        
        # Validaciones
        if not token_str:
            return Response({
                'error': 'El token es requerido.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not new_password:
            return Response({
                'error': 'La nueva contraseña es requerida.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_password != confirm_password:
            return Response({
                'error': 'Las contraseñas no coinciden.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 8:
            return Response({
                'error': 'La contraseña debe tener al menos 8 caracteres.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar token
        try:
            token = PasswordResetToken.objects.get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response({
                'error': 'Token inválido o expirado.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar validez
        if not token.is_valid:
            return Response({
                'error': 'Token inválido o expirado.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Cambiar contraseña
        user = token.user
        user.set_password(new_password)
        user.save()
        
        # Marcar token como usado
        token.used = True
        token.save()
        
        # Desbloquear cuenta si estaba bloqueada
        if user.is_locked or user.failed_login_attempts > 0:
            user.reset_login_attempts()
        
        return Response({
            'message': 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
        }, status=status.HTTP_200_OK)
