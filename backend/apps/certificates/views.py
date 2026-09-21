from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Lesson
from apps.courses.selectors import curso_inscribible_o_404
from apps.progress.models import LessonProgress
from apps.progress.activity_logger import log_activity
from apps.quizzes.models import FinalEvaluation, FinalEvaluationAttempt

from .models import Certificate
from .pdf import dibujar_diploma
from .serializers import CertificateSerializer, CertificateVerifySerializer
from .services import (
    datos_del_diploma,
    documento_del_certificado,
    emitir_certificado,
    resolver_recurso,
)


class MyCertificatesView(generics.ListAPIView):
    """GET /api/certificates/ – list certificates for the current user."""

    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user).select_related('course')


class CertificateVerifyView(generics.RetrieveAPIView):
    """GET /api/certificates/verify/{code}/ – public certificate verification."""

    serializer_class = CertificateVerifySerializer
    permission_classes = [AllowAny]
    lookup_field = 'verification_code'
    queryset = Certificate.objects.select_related('user', 'course')


class CertificateClaimView(APIView):
    """
    POST /api/certificates/claim/{course_id}/ –
    reclamar certificado si el curso está completo y la evaluación final aprobada.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        # AMBITO>> Reclamar el diploma de un curso exige acceso al contenido de
        # su academia, no solo verlo en la vitrina. Antes era
        # `Course.objects.get(pk=course_id)`: un id inexistente devolvia 500 y
        # la academia no se comprobaba en ningun momento.
        course = curso_inscribible_o_404(request.user, course_id)

        existing = Certificate.objects.filter(user=request.user, course=course).first()
        if existing:
            return Response(
                CertificateSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        # Verificar completitud del curso (lecciones + quizzes)
        total_lessons = Lesson.objects.filter(module__course=course).count()
        completed_lessons = LessonProgress.objects.filter(
            user=request.user,
            lesson__module__course=course,
            completed=True,
        ).count()

        total_quizzes = course.modules.filter(quiz__isnull=False).count()
        quizzes_passed = request.user.quiz_attempts.filter(
            quiz__module__course=course,
            passed=True,
        ).values('quiz').distinct().count()

        if total_lessons == 0 or completed_lessons < total_lessons:
            return Response(
                {'detail': f'Debes completar todas las lecciones ({completed_lessons}/{total_lessons}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if total_quizzes > 0 and quizzes_passed < total_quizzes:
            return Response(
                {'detail': f'Debes aprobar todos los quizzes ({quizzes_passed}/{total_quizzes}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Si existe evaluación final configurada, exigir que esté aprobada
        try:
            evaluation = FinalEvaluation.objects.get(course=course)
            has_passed_eval = FinalEvaluationAttempt.objects.filter(
                student=request.user,
                evaluation=evaluation,
                passed=True,
            ).exists()
            if not has_passed_eval:
                return Response(
                    {'detail': 'Debes aprobar la evaluación final para obtener tu certificado.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except FinalEvaluation.DoesNotExist:
            # Si el curso no tiene evaluación final, solo se exige curso completo
            pass

        certificate = emitir_certificado(request.user, course)
        log_activity(
            request.user,
            'certificate_claimed',
            'course',
            course.id,
            {'course_id': course.id},
        )
        return Response(
            CertificateSerializer(certificate).data,
            status=status.HTTP_201_CREATED,
        )


class CertificateDownloadView(APIView):
    """
    GET /api/certificates/{pk}/download/ – descarga el diploma en PDF.

    El dibujo vive en `pdf.py` y los datos en `services.py`; aqui solo queda
    quien puede pedirlo. Antes esta vista tenia dentro las coordenadas, los
    colores y el texto, incluido el parrafo de Maily Soft que se imprimia en los
    diplomas de las tres academias.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # El dueno se filtra en la CONSULTA, no despues: asi un certificado ajeno
        # y uno inexistente dan la misma respuesta. Antes se buscaba por pk y se
        # devolvia 403 si era de otro, con lo que el 403 confirmaba que existia y
        # permitia contar por enumeracion de ids cuantos certificados hay emitidos
        # y a cuantas personas. Sobre un documento con el nombre completo de
        # alguien, confirmar la existencia ya es informacion.
        #
        # Punto 10 de security-checklist: 403 = tu rol no puede hacer esta accion,
        # 404 = ese dato no existe para ti.
        certificados = Certificate.objects.select_related(
            'user', 'course', 'course__instructor', 'course__section',
            'course__plantilla_de_diploma',
        )
        if request.user.role != 'admin':
            certificados = certificados.filter(user=request.user)

        try:
            certificate = certificados.get(pk=pk)
        except Certificate.DoesNotExist:
            return Response({'detail': 'Certificado no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(content_type='application/pdf')
        filename = f'diploma-{certificate.course_id}-{certificate.user_id}.pdf'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        dibujar_diploma(
            response,
            datos_del_diploma(certificate),
            documento_del_certificado(certificate),
            resolver_recurso=resolver_recurso,
        )
        return response
