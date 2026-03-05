from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.courses.models import Course
from apps.courses.serializers import CourseListSerializer
from apps.users.permissions import IsAdmin, IsSuperAdmin

from .models import PromoVideo, Section, SectionMembership
from .permissions import HasSectionAccess, CanViewSectionPreview
from .serializers import (
    PromoVideoAdminSerializer,
    PromoVideoSerializer,
    SectionMembershipSerializer,
    SectionSerializer,
)


class SectionListView(generics.ListAPIView):
    """
    GET /api/sections/ – Lista de secciones activas.
    Pública, pensada para la landing y selección de sección.
    """

    queryset = Section.objects.filter(is_active=True)
    serializer_class = SectionSerializer
    permission_classes = [AllowAny]


class SectionDetailView(generics.RetrieveAPIView):
    """
    GET /api/sections/{slug}/ – Detalle de una sección.
    Pública.
    """

    queryset = Section.objects.filter(is_active=True)
    serializer_class = SectionSerializer
    lookup_field = 'slug'
    permission_classes = [AllowAny]


class SectionPreviewCoursesView(generics.ListAPIView):
    """
    GET /api/sections/{slug}/preview/ – Cursos de preview de una sección.

    - Acceso público solo si `allow_public_preview=True` (CanViewSectionPreview).
    - Muestra cursos publicados asociados a la sección.
    """

    serializer_class = CourseListSerializer
    permission_classes = [CanViewSectionPreview]

    def get_queryset(self):
        # La sección ya viene resuelta por CanViewSectionPreview y almacenada en la vista
        section = getattr(self, 'section', None)
        if section is None:
            section = get_object_or_404(Section, slug=self.kwargs['slug'], is_active=True)

        qs = Course.objects.filter(section=section, status='published').select_related(
            'instructor',
        ).annotate(
            total_lessons=Count('modules__lessons'),
            students_count=Count('enrollments'),
        )
        return qs


class SectionCoursesView(generics.ListAPIView):
    """
    GET /api/sections/{slug}/courses/ – Cursos de una sección.

    - Requiere acceso a la sección (HasSectionAccess).
    - Para estudiantes solo muestra cursos publicados.
    - Para instructores muestra sus cursos + publicados.
    """

    serializer_class = CourseListSerializer
    permission_classes = [IsAuthenticated, HasSectionAccess]

    def get_queryset(self):
        # La sección ya viene resuelta por HasSectionAccess y almacenada en la vista
        section = getattr(self, 'section', None)
        if section is None:
            section = get_object_or_404(Section, slug=self.kwargs['slug'], is_active=True)

        qs = Course.objects.filter(section=section).select_related(
            'instructor',
            'category',
        ).annotate(
            total_lessons=Count('modules__lessons'),
            students_count=Count('enrollments'),
        )

        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(status='published')
        elif user.role == 'instructor':
            from django.db.models import Q

            qs = qs.filter(Q(status='published') | Q(instructor=user))

        # Filtros adicionales por categoría y tags (Fase 3)
        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        tags_param = self.request.query_params.get('tags')
        if tags_param:
            tags = [t.strip() for t in tags_param.split(',') if t.strip()]
            if tags:
                qs = qs.filter(tags__contains=tags)

        return qs


class MySectionsView(generics.ListAPIView):
    """
    GET /api/sections/my-sections/ – Secciones a las que tiene acceso el usuario autenticado.

    - Siempre incluye secciones públicas activas.
    - Incluye secciones con membresías activas y no expiradas.
    """

    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()

        # IDs de secciones con membresía activa y no expirada
        membership_section_ids = (
            SectionMembership.objects.filter(
                user=user,
                is_active=True,
            )
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
            .values_list('section_id', flat=True)
        )

        return Section.objects.filter(
            Q(id__in=membership_section_ids)
            | Q(section_type=Section.SectionType.PUBLIC),
            is_active=True,
        ).distinct().order_by('name')


class SectionMembersListCreateView(generics.ListCreateAPIView):
    """
    GET /api/admin/sections/{slug}/members/ – Listar miembros de una sección.
    POST /api/admin/sections/{slug}/members/ – Otorgar acceso a un usuario.

    - Cualquier admin puede listar y crear en todas las secciones.
    - El cuerpo de POST acepta `user_id`, `role`, `expires_at` (opcional).
    """

    serializer_class = SectionMembershipSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_section(self):
        section = getattr(self, 'section', None)
        if section is None:
            section = get_object_or_404(Section, slug=self.kwargs['slug'], is_active=True)
            setattr(self, 'section', section)
        return section

    def get_queryset(self):
        section = self.get_section()
        return (
            SectionMembership.objects.select_related('user', 'section', 'granted_by')
            .filter(section=section)
            .order_by('-granted_at')
        )

    def perform_create(self, serializer):
        section = self.get_section()
        serializer.save(section=section, granted_by=self.request.user)


class SectionMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    PATCH /api/admin/sections/{slug}/members/{user_id}/ – Modificar membresía.
    DELETE /api/admin/sections/{slug}/members/{user_id}/ – Revocar acceso.

    - Cualquier admin puede modificar y revocar en todas las secciones.
    La búsqueda se realiza por combinación sección + user_id.
    """

    serializer_class = SectionMembershipSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_section(self):
        section = getattr(self, 'section', None)
        if section is None:
            section = get_object_or_404(Section, slug=self.kwargs['slug'], is_active=True)
            setattr(self, 'section', section)
        return section

    def get_object(self):
        section = self.get_section()
        user_id = self.kwargs['user_id']
        return get_object_or_404(
            SectionMembership.objects.select_related('user', 'section', 'granted_by'),
            section=section,
            user_id=user_id,
        )

    def delete(self, request, *args, **kwargs):
        """
        Revoca la membresía eliminando el registro.
        """
        membership = self.get_object()
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Videos de promoción (Maily en Longevity)
# ---------------------------------------------------------------------------

class SectionPromoVideosView(generics.ListAPIView):
    """
    GET /api/sections/{slug}/promo-videos/ – Lista de videos de promoción activos de la sección.

    Pública (AllowAny) para que la página "Conocer Maily Academia" los consuma.
    Solo devuelve videos con is_active=True, ordenados por order.
    """

    serializer_class = PromoVideoSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        return (
            PromoVideo.objects.filter(
                section__slug=slug,
                section__is_active=True,
                is_active=True,
            )
            .order_by('order', 'id')
        )


class PromoVideoAdminListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/sections/{slug}/promo-videos/ – Listar videos de promoción (todos).
    POST /api/admin/sections/{slug}/promo-videos/ – Crear video de promoción.

    Solo super-admin.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = PromoVideoAdminSerializer

    def get_section(self):
        section = getattr(self, '_section', None)
        if section is None:
            section = get_object_or_404(
                Section,
                slug=self.kwargs.get('slug'),
                is_active=True,
            )
            setattr(self, '_section', section)
        return section

    def get_queryset(self):
        return PromoVideo.objects.filter(section=self.get_section()).order_by('order', 'id')

    def perform_create(self, serializer):
        serializer.save(section=self.get_section())


class PromoVideoAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/admin/sections/{slug}/promo-videos/{pk}/ – Detalle de video de promoción.

    Solo super-admin.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = PromoVideoAdminSerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        return PromoVideo.objects.filter(section__slug=slug).order_by('order', 'id')

