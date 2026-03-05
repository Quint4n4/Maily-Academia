from django.db.models import Count
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdminOrInstructor

from .models import QnAQuestion, QnAAnswer
from .serializers import (
    QnAQuestionSerializer,
    QnAQuestionCreateSerializer,
    QnAAnswerSerializer,
    QnAAnswerCreateSerializer,
)


class QuestionListView(generics.ListAPIView):
    """GET /api/lessons/{lesson_id}/questions/ – list questions for a lesson."""

    serializer_class = QnAQuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            QnAQuestion.objects
            .filter(lesson_id=self.kwargs['lesson_id'])
            .select_related('user')
            .prefetch_related('answers__user')
            .annotate(answers_count=Count('answers'))
        )


class QuestionCreateView(generics.CreateAPIView):
    """POST /api/lessons/{lesson_id}/questions/ – ask a question."""

    serializer_class = QnAQuestionCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        from apps.courses.models import Lesson
        from apps.progress.activity_logger import log_activity
        lesson = Lesson.objects.get(pk=self.kwargs['lesson_id'])
        question = serializer.save(user=self.request.user, lesson=lesson)
        log_activity(
            self.request.user,
            'question_asked',
            'question',
            question.id,
            {'lesson_id': lesson.id},
        )


class AnswerCreateView(generics.CreateAPIView):
    """POST /api/questions/{question_id}/answers/ – answer a question."""

    serializer_class = QnAAnswerCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        question = QnAQuestion.objects.get(pk=self.kwargs['question_id'])
        serializer.save(user=self.request.user, question=question)


class AnswerAcceptView(APIView):
    """PATCH /api/answers/{answer_id}/accept/ – mark an answer as accepted."""

    permission_classes = [IsAdminOrInstructor]

    def patch(self, request, answer_id):
        answer = QnAAnswer.objects.get(pk=answer_id)
        answer.is_accepted = True
        answer.save()
        return Response(QnAAnswerSerializer(answer).data)


class InstructorQnAStatsView(APIView):
    """GET /api/qna/instructor-stats/ – pending count and questions per course for instructor."""

    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        from django.db.models import Exists, OuterRef

        instructor = request.user
        # Pending = questions in instructor's courses with no answers yet
        has_answer = QnAAnswer.objects.filter(question_id=OuterRef('pk'))
        pending_count = QnAQuestion.objects.filter(
            lesson__module__course__instructor=instructor,
        ).exclude(Exists(has_answer)).count()

        # Per-course: count questions per course
        questions_per_course = (
            QnAQuestion.objects.filter(lesson__module__course__instructor=instructor)
            .values('lesson__module__course_id', 'lesson__module__course__title')
            .annotate(questions_count=Count('id'))
            .order_by('-questions_count')
        )
        questions_per_course_list = [
            {
                'course_id': x['lesson__module__course_id'],
                'course_title': x['lesson__module__course__title'] or '',
                'questions_count': x['questions_count'],
            }
            for x in questions_per_course
        ]

        return Response({
            'questions_pending_count': pending_count,
            'questions_per_course': questions_per_course_list,
        })
