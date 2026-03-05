from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course, Lesson
from apps.progress.models import LessonProgress
from apps.progress.activity_logger import log_activity
from apps.quizzes.models import FinalEvaluation, FinalEvaluationAttempt

from .models import Certificate
from .serializers import CertificateSerializer, CertificateVerifySerializer


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
        course = Course.objects.get(pk=course_id)

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

        certificate = Certificate.objects.create(user=request.user, course=course)
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
    GET /api/certificates/{pk}/download/ – descarga el certificado en PDF.
    Genera un PDF usando una plantilla de fondo y datos dinámicos.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            certificate = Certificate.objects.select_related('user', 'course', 'course__instructor').get(pk=pk)
        except Certificate.DoesNotExist:
            return Response({'detail': 'Certificado no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if certificate.user != request.user and request.user.role != 'admin':
            return Response({'detail': 'No tienes permiso para descargar este certificado.'}, status=status.HTTP_403_FORBIDDEN)

        # Ruta a la plantilla de imagen del certificado
        template_path = Path(settings.BASE_DIR) / 'static' / 'certificates' / 'maily_template.png'

        # Crear respuesta HTTP con PDF
        response = HttpResponse(content_type='application/pdf')
        filename = f'certificado-{certificate.course.id}-{certificate.user.id}.pdf'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        # Configurar página horizontal A4
        page_width, page_height = landscape(A4)
        pdf = canvas.Canvas(response, pagesize=(page_width, page_height))

        # Dibujar plantilla si existe
        if template_path.exists():
          pdf.drawImage(
              str(template_path),
              0,
              0,
              width=page_width,
              height=page_height,
              preserveAspectRatio=True,
              mask='auto',
          )

        # Coordenadas aproximadas (pueden ajustarse según la plantilla)
        student_name = certificate.user.get_full_name() or certificate.user.email
        course_title = certificate.course.title
        instructor_name = certificate.course.instructor.get_full_name() or certificate.course.instructor.email
        issued_date = certificate.issued_at.astimezone().strftime('%d/%m/%Y')

        pdf.setTitle(f'Certificado - {student_name}')

        # Nombre del alumno — más separado del "Otorgado a:" de la plantilla, itálica-negrita
        pdf.setFont('Helvetica-BoldOblique', 30)
        pdf.setFillColorRGB(0.08, 0.08, 0.08)
        pdf.drawCentredString(page_width / 2, page_height * 0.39, student_name)

        # Cubrir el texto estático del curso en la plantilla (fondo blanco sin borde)
        pdf.setFillColorRGB(1, 1, 1)
        pdf.rect(
            page_width * 0.08,
            page_height * 0.23,
            page_width * 0.84,
            page_height * 0.15,
            fill=1,
            stroke=0,
        )

        # --- Redibujar párrafo con el nombre real del curso ---
        font_body = 13
        gray = (0.38, 0.38, 0.38)
        dark = (0.08, 0.08, 0.08)

        # Línea 1: "Por concluir satisfactoriamente la [CURSO]."
        prefix = 'Por concluir satisfactoriamente la '
        suffix = '.'
        prefix_w = pdf.stringWidth(prefix, 'Helvetica', font_body)
        course_w = pdf.stringWidth(course_title, 'Helvetica-Bold', font_body)
        suffix_w = pdf.stringWidth(suffix, 'Helvetica', font_body)
        line1_x = (page_width - prefix_w - course_w - suffix_w) / 2
        line1_y = page_height * 0.355

        pdf.setFont('Helvetica', font_body)
        pdf.setFillColorRGB(*gray)
        pdf.drawString(line1_x, line1_y, prefix)
        pdf.setFont('Helvetica-Bold', font_body)
        pdf.setFillColorRGB(*dark)
        pdf.drawString(line1_x + prefix_w, line1_y, course_title)
        pdf.setFont('Helvetica', font_body)
        pdf.setFillColorRGB(*gray)
        pdf.drawString(line1_x + prefix_w + course_w, line1_y, suffix)

        # Línea 2
        pdf.setFont('Helvetica', font_body)
        pdf.setFillColorRGB(*gray)
        pdf.drawCentredString(page_width / 2, page_height * 0.315, 'Ahora estás listo para sacarle el mayor provecho')

        # Línea 3
        pdf.drawCentredString(page_width / 2, page_height * 0.277, 'y exponenciar tu consultorio.')

        # Fecha (inferior izquierdo)
        pdf.setFont('Helvetica', 11)
        pdf.setFillColorRGB(0.25, 0.25, 0.25)
        pdf.drawString(page_width * 0.15, page_height * 0.155, f'Fecha: {issued_date}')

        # Instructor debajo de la línea de firma (inferior centro)
        pdf.setFont('Helvetica', 11)
        pdf.setFillColorRGB(0.25, 0.25, 0.25)
        pdf.drawCentredString(page_width * 0.5, page_height * 0.095, f'Instructor/a: {instructor_name}')

        pdf.showPage()
        pdf.save()

        return response
