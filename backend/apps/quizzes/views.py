from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course, Lesson
from apps.certificates.models import Certificate
from apps.progress.models import LessonProgress
from apps.users.permissions import IsAdminOrInstructor, IsInstructor, IsStudent

from .models import (
    Quiz,
    Question,
    QuizAttempt,
    FinalEvaluation,
    FinalEvaluationRequest,
    FinalEvaluationAttempt,
)
from .serializers import (
    QuizSerializer,
    QuizCreateSerializer,
    QuestionAdminSerializer,
    QuizAttemptCreateSerializer,
    QuizAttemptResultSerializer,
    FinalEvaluationSerializer,
    FinalEvaluationAdminSerializer,
    FinalEvaluationQuestionAdminSerializer,
    FinalEvaluationAttemptCreateSerializer,
    FinalEvaluationAttemptResultSerializer,
    FinalEvaluationRequestSerializer,
    FinalEvaluationApproveSerializer,
)


class QuizByModuleView(generics.RetrieveAPIView):
    """GET /api/modules/{module_id}/quiz/ – get the quiz for a module."""

    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(
            Quiz.objects.prefetch_related('questions'),
            module_id=self.kwargs['module_id'],
        )


class QuizCreateView(generics.CreateAPIView):
    """POST /api/modules/{module_id}/quiz/ – create a quiz (instructor/admin)."""

    serializer_class = QuizCreateSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_create(self, serializer):
        from apps.courses.models import Module
        module = Module.objects.get(pk=self.kwargs['module_id'])
        serializer.save(module=module)


class QuestionCreateView(generics.CreateAPIView):
    """POST /api/quizzes/{quiz_id}/questions/ – add a question."""

    serializer_class = QuestionAdminSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_create(self, serializer):
        quiz = Quiz.objects.get(pk=self.kwargs['quiz_id'])
        serializer.save(quiz=quiz)


class QuizAttemptView(generics.CreateAPIView):
    """POST /api/quizzes/{quiz_id}/attempt/ – submit answers and get score."""

    serializer_class = QuizAttemptCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz = Quiz.objects.prefetch_related('questions').get(pk=self.kwargs['quiz_id'])
        submitted = serializer.validated_data['answers']

        correct = 0
        total = quiz.questions.count()

        for question in quiz.questions.all():
            q_id = str(question.id)
            if q_id in submitted and submitted[q_id] == question.correct_answer:
                correct += 1

        score = round((correct / total) * 100) if total > 0 else 0
        passed = score >= quiz.passing_score

        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            answers=submitted,
            score=score,
            passed=passed,
        )

        return Response(
            QuizAttemptResultSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )


class QuizUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/quizzes/{quiz_id}/"""

    serializer_class = QuizCreateSerializer
    permission_classes = [IsAdminOrInstructor]
    queryset = Quiz.objects.all()
    lookup_url_kwarg = 'quiz_id'


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/questions/{pk}/"""

    serializer_class = QuestionAdminSerializer
    permission_classes = [IsAdminOrInstructor]
    queryset = Question.objects.all()


class QuizResultsView(generics.ListAPIView):
    """GET /api/quizzes/{quiz_id}/results/ – list the user's attempts for this quiz."""

    serializer_class = QuizAttemptResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(
            user=self.request.user,
            quiz_id=self.kwargs['quiz_id'],
        )


# ---------------------------------------------------------------------------
# Final evaluation views (evaluación final de curso)
# ---------------------------------------------------------------------------


class FinalEvaluationRequestView(APIView):
    """
    GET  /api/courses/{course_id}/final-evaluation/request/ – estado actual de la solicitud.
    POST /api/courses/{course_id}/final-evaluation/request/ – el alumno solicita la evaluación final.
    """

    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, course_id):
        course = Course.objects.get(pk=course_id)
        req = FinalEvaluationRequest.objects.filter(
            student=request.user,
            course=course,
        ).order_by('-requested_at').first()
        if not req:
            return Response(
                {'detail': 'No hay solicitud de evaluación registrada.', 'code': 'no_request'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(FinalEvaluationRequestSerializer(req).data, status=status.HTTP_200_OK)

    def post(self, request, course_id):
        course = Course.objects.get(pk=course_id)

        # Verificar que exista evaluación final para el curso
        try:
            evaluation = course.final_evaluation
        except FinalEvaluation.DoesNotExist:  # type: ignore[attr-defined]
            return Response(
                {'detail': 'Este curso no tiene una evaluación final configurada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que el curso esté completamente terminado
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
                {'detail': f'Debes completar todas las lecciones ({completed_lessons}/{total_lessons}) antes de solicitar la evaluación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if total_quizzes > 0 and quizzes_passed < total_quizzes:
            return Response(
                {'detail': f'Debes aprobar todos los quizzes del curso ({quizzes_passed}/{total_quizzes}) antes de solicitar la evaluación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Buscar solicitud activa (pendiente o aprobada)
        active_request = FinalEvaluationRequest.objects.filter(
            student=request.user,
            course=course,
            status__in=[
                FinalEvaluationRequest.Status.PENDING,
                FinalEvaluationRequest.Status.APPROVED,
            ],
        ).first()

        if active_request:
            serializer = FinalEvaluationRequestSerializer(active_request)
            return Response(serializer.data, status=status.HTTP_200_OK)

        req = FinalEvaluationRequest.objects.create(
            student=request.user,
            course=course,
            evaluation=evaluation,
        )
        serializer = FinalEvaluationRequestSerializer(req)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FinalEvaluationDetailView(APIView):
    """
    GET /api/courses/{course_id}/final-evaluation/ –
    obtiene la evaluación final (si la solicitud está aprobada y en ventana de tiempo).
    """

    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, course_id):
        course = Course.objects.get(pk=course_id)
        try:
            evaluation = course.final_evaluation
        except FinalEvaluation.DoesNotExist:  # type: ignore[attr-defined]
            return Response(
                {'detail': 'Este curso no tiene una evaluación final configurada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        req = FinalEvaluationRequest.objects.filter(
            student=request.user,
            course=course,
        ).order_by('-requested_at').first()

        if not req or req.status not in [
            FinalEvaluationRequest.Status.APPROVED,
        ]:
            return Response(
                {'detail': 'No tienes una evaluación final aprobada aún.', 'code': 'no_active_request'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not req.available_from or not req.available_until:
            return Response(
                {'detail': 'La evaluación aún no está disponible. Espera a que el profesor la active.', 'code': 'not_yet_available'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if now < req.available_from:
            return Response(
                {'detail': 'La evaluación todavía no está disponible.', 'code': 'too_early'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if now > req.available_until:
            req.status = FinalEvaluationRequest.Status.EXPIRED
            req.save(update_fields=['status'])
            return Response(
                {'detail': 'El tiempo para realizar la evaluación ha expirado. Pide al profesor que la reactive.', 'code': 'expired'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FinalEvaluationSerializer(evaluation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FinalEvaluationAttemptView(APIView):
    """
    POST /api/final-evaluations/{evaluation_id}/attempt/ –
    envía respuestas de la evaluación final.
    """

    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, evaluation_id):
        try:
            evaluation = FinalEvaluation.objects.prefetch_related('questions').get(pk=evaluation_id)
        except FinalEvaluation.DoesNotExist:
            return Response(
                {'detail': 'Evaluación no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = FinalEvaluationAttemptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = serializer.validated_data['answers']

        now = timezone.now()
        # Usar la última solicitud del alumno para este curso/evaluación
        req = FinalEvaluationRequest.objects.filter(
            student=request.user,
            course=evaluation.course,
            evaluation=evaluation,
        ).order_by('-requested_at').first()

        if not req:
            return Response(
                {'detail': 'No tienes una solicitud de evaluación registrada.', 'code': 'no_request'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not req.available_from or not req.available_until or req.status != FinalEvaluationRequest.Status.APPROVED:
            return Response(
                {'detail': 'La evaluación no está actualmente disponible.', 'code': 'not_available'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if now < req.available_from:
            return Response(
                {'detail': 'La evaluación todavía no está disponible.', 'code': 'too_early'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if now > req.available_until:
            req.status = FinalEvaluationRequest.Status.EXPIRED
            req.save(update_fields=['status'])
            return Response(
                {'detail': 'El tiempo para realizar la evaluación ha expirado. Pide al profesor que la reactive.', 'code': 'expired'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        correct = 0
        total = evaluation.questions.count()

        for question in evaluation.questions.all():
            q_id = str(question.id)
            if q_id in submitted and submitted[q_id] == question.correct_answer:
                correct += 1

        score = round((correct / total) * 100) if total > 0 else 0
        passed = score >= evaluation.passing_score

        attempt = FinalEvaluationAttempt.objects.create(
            student=request.user,
            evaluation=evaluation,
            request=req,
            answers=submitted,
            score=score,
            passed=passed,
        )

        # Actualizar estado de la solicitud según resultado
        req.status = (
            FinalEvaluationRequest.Status.COMPLETED
            if passed
            else FinalEvaluationRequest.Status.FAILED
        )
        req.save(update_fields=['status'])

        # Emitir certificado automáticamente si aprobó la evaluación
        if passed:
            Certificate.objects.get_or_create(
                user=request.user,
                course=evaluation.course,
            )

        result_serializer = FinalEvaluationAttemptResultSerializer(attempt)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)


class FinalEvaluationQuestionCreateView(generics.CreateAPIView):
    """
    POST /api/final-evaluations/{evaluation_id}/questions/ –
    agregar pregunta a la evaluación final (profesor/admin).
    """

    serializer_class = FinalEvaluationQuestionAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def perform_create(self, serializer):
        evaluation = FinalEvaluation.objects.get(pk=self.kwargs['evaluation_id'])
        serializer.save(evaluation=evaluation)


class FinalEvaluationQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/final-evaluation-questions/{pk}/ –
    gestión de preguntas de evaluación final.
    """

    serializer_class = FinalEvaluationQuestionAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInstructor]
    queryset = FinalEvaluationQuestionAdminSerializer.Meta.model.objects.all()


class InstructorFinalEvaluationRequestListView(generics.ListAPIView):
    """
    GET /api/instructor/evaluations/requests/ –
    lista solicitudes de evaluación final de los cursos del profesor.
    """

    serializer_class = FinalEvaluationRequestSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        qs = FinalEvaluationRequest.objects.select_related('student', 'course')
        # Solo solicitudes de cursos del instructor
        qs = qs.filter(course__instructor=self.request.user)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        course_id = self.request.query_params.get('course_id')
        if course_id:
            qs = qs.filter(course_id=course_id)

        return qs


class InstructorFinalEvaluationRequestApproveView(APIView):
    """
    POST /api/instructor/evaluations/requests/{pk}/approve/ –
    aprobar solicitud y definir ventana de tiempo.
    """

    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, pk):
        try:
            req = FinalEvaluationRequest.objects.select_related('course').get(pk=pk)
        except FinalEvaluationRequest.DoesNotExist:
            return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if req.course.instructor != request.user and request.user.role != 'admin':
            return Response({'detail': 'No tienes permiso para gestionar esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = FinalEvaluationApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        duration_minutes = serializer.validated_data['duration_minutes']

        now = timezone.now()
        req.approved_at = now
        req.available_from = now
        req.available_until = now + timedelta(minutes=duration_minutes)
        req.status = FinalEvaluationRequest.Status.APPROVED
        req.save(update_fields=['approved_at', 'available_from', 'available_until', 'status'])

        return Response(FinalEvaluationRequestSerializer(req).data, status=status.HTTP_200_OK)


class FinalEvaluationAdminView(APIView):
    """
    GET/PUT /api/courses/{course_id}/final-evaluation/admin/ –
    gestión de la evaluación final (profesor/admin).
    """

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request, course_id):
        course = Course.objects.get(pk=course_id)
        evaluation, _created = FinalEvaluation.objects.get_or_create(
            course=course,
            defaults={'title': 'Evaluación final'},
        )
        serializer = FinalEvaluationAdminSerializer(evaluation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, course_id):
        course = Course.objects.get(pk=course_id)
        evaluation, _created = FinalEvaluation.objects.get_or_create(
            course=course,
            defaults={'title': 'Evaluación final'},
        )
        serializer = FinalEvaluationAdminSerializer(evaluation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
