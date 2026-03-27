import re
from decimal import Decimal

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course, Lesson
from apps.users.permissions import IsAdmin, IsAdminOrInstructor

from .models import Enrollment, LessonProgress, Purchase
from .activity_logger import log_activity
from .serializers import (
    EnrollmentSerializer,
    LessonProgressSerializer,
    CourseProgressSerializer,
    DashboardSerializer,
    PurchaseAdminSerializer,
)


class AdminPurchasesView(generics.ListAPIView):
    """GET /api/admin/purchases/ – list purchases (admin only)."""

    serializer_class = PurchaseAdminSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return (
            Purchase.objects.filter(status=Purchase.Status.COMPLETED)
            .select_related('user', 'course')
            .order_by('-paid_at')
        )


class EnrollView(generics.CreateAPIView):
    """POST /api/courses/{course_id}/enroll/ – enroll current student in a course."""

    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        course_id = self.kwargs['course_id']
        course = Course.objects.get(pk=course_id)

        if course.price and course.price > 0:
            return Response(
                {'detail': 'Este curso requiere pago. Utiliza la opción de compra.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user,
            course=course,
        )
        if not created:
            return Response(
                {'detail': 'Ya estás inscrito en este curso.'},
                status=status.HTTP_200_OK,
            )
        log_activity(
            request.user,
            'course_enrolled',
            'course',
            course_id,
            {'course_title': course.title},
        )
        return Response(
            EnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED,
        )


class PurchaseView(APIView):
    """POST /api/courses/{course_id}/purchase/ – simulated payment to unlock paid course."""

    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id)
        if not course.price or course.price <= 0:
            return Response(
                {'detail': 'Este curso es gratuito. Usa la opción de inscripción.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'detail': 'Ya estás inscrito en este curso.'},
                status=status.HTTP_200_OK,
            )
        card_number = (request.data.get('card_number') or '').replace(' ', '')
        expiry = request.data.get('expiry') or ''
        cvv = request.data.get('cvv') or ''
        card_holder = (request.data.get('card_holder') or '').strip()
        if not re.match(r'^\d{16}$', card_number):
            return Response(
                {'detail': 'Número de tarjeta inválido (16 dígitos).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.match(r'^\d{2}/\d{2}$', expiry):
            return Response(
                {'detail': 'Fecha de vencimiento inválida (MM/YY).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.match(r'^\d{3,4}$', cvv):
            return Response(
                {'detail': 'CVV inválido (3 o 4 dígitos).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(card_holder) < 2:
            return Response(
                {'detail': 'Nombre del titular requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        purchase = Purchase.objects.create(
            user=request.user,
            course=course,
            amount=course.price,
            status=Purchase.Status.COMPLETED,
            payment_method='card',
        )
        enrollment, _ = Enrollment.objects.get_or_create(
            user=request.user,
            course=course,
        )
        log_activity(
            request.user,
            'course_enrolled',
            'course',
            course.id,
            {'course_title': course.title, 'via': 'purchase'},
        )
        return Response(
            {
                'success': True,
                'enrollment': EnrollmentSerializer(enrollment).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CourseStudentsView(generics.ListAPIView):
    """GET /api/courses/{course_id}/students/ – list enrolled students (owner/admin)."""

    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        course_id = self.kwargs['course_id']
        course = get_object_or_404(Course, pk=course_id)
        user = self.request.user
        # Solo el instructor del curso o un admin pueden ver la lista de alumnos
        is_admin = user.role == 'admin' or user.is_superuser or user.is_staff
        if not is_admin and course.instructor_id != user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No tienes permiso para ver los alumnos de este curso.')
        return Enrollment.objects.filter(course_id=course_id).select_related('user')


class LessonCompleteView(APIView):
    """POST /api/lessons/{lesson_id}/complete/ – mark a lesson as completed."""

    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        lesson = Lesson.objects.select_related('module__course').get(pk=lesson_id)
        course = lesson.module.course
        if not Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'detail': 'Debes estar inscrito en el curso para completar lecciones.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        progress, created = LessonProgress.objects.get_or_create(
            user=request.user,
            lesson=lesson,
            defaults={'completed': True},
        )
        if not created and not progress.completed:
            progress.completed = True
            progress.save()

        log_activity(
            request.user,
            'lesson_completed',
            'lesson',
            lesson_id,
            {'course_id': course.id, 'lesson_title': lesson.title},
        )
        return Response(LessonProgressSerializer(progress).data)


class LessonPositionUpdateView(APIView):
    """PATCH /api/progress/lessons/{lesson_id}/position/ – save video position for resume."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, lesson_id):
        lesson = Lesson.objects.select_related('module__course').get(pk=lesson_id)
        course = lesson.module.course
        if not Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'detail': 'Debes estar inscrito en el curso.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        position_seconds = request.data.get('position_seconds')
        if position_seconds is None:
            return Response(
                {'detail': 'position_seconds es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            position_seconds = max(0, int(position_seconds))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'position_seconds debe ser un número entero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        progress, _ = LessonProgress.objects.get_or_create(
            user=request.user,
            lesson=lesson,
            defaults={'completed': False, 'video_position_seconds': position_seconds},
        )
        progress.video_position_seconds = position_seconds
        progress.save(update_fields=['video_position_seconds'])
        return Response(LessonProgressSerializer(progress).data)


class CourseProgressView(APIView):
    """GET /api/progress/courses/{course_id}/ – progress for the current user in a course."""

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = Course.objects.get(pk=course_id)
        if not Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'detail': 'No estás inscrito en este curso.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        total_lessons = Lesson.objects.filter(module__course=course).count()
        completed_lessons = LessonProgress.objects.filter(
            user=request.user,
            lesson__module__course=course,
            completed=True,
        ).count()

        total_quizzes = course.modules.filter(quiz__isnull=False).count()
        passed_quiz_ids = list(
            request.user.quiz_attempts.filter(
                quiz__module__course=course,
                passed=True,
            ).values_list('quiz', flat=True).distinct()
        )
        quizzes_passed = len(passed_quiz_ids)

        progress_percent = round((completed_lessons / total_lessons) * 100, 1) if total_lessons > 0 else 0

        completed_ids = set(
            LessonProgress.objects.filter(
                user=request.user, completed=True,
                lesson__module__course=course,
            ).values_list('lesson_id', flat=True)
        )
        resume_at = None
        for mod in course.modules.order_by('order'):
            for les in mod.lessons.order_by('order'):
                if les.id not in completed_ids:
                    resume_at = {'module_id': mod.id, 'lesson_id': les.id}
                    break
            if resume_at:
                break
        if not resume_at and total_lessons > 0:
            last_mod = course.modules.order_by('order').last()
            last_les = last_mod.lessons.order_by('order').last() if last_mod else None
            if last_les:
                resume_at = {'module_id': last_mod.id, 'lesson_id': last_les.id}

        completed_lesson_ids = list(completed_ids)
        lesson_positions = dict(
            LessonProgress.objects.filter(
                user=request.user,
                lesson__module__course=course,
                video_position_seconds__isnull=False,
            ).exclude(video_position_seconds=0).values_list('lesson_id', 'video_position_seconds')
        )

        data = {
            'course_id': course.id,
            'course_title': course.title,
            'total_lessons': total_lessons,
            'completed_lessons': completed_lessons,
            'progress_percent': progress_percent,
            'quizzes_passed': quizzes_passed,
            'total_quizzes': total_quizzes,
            'passed_quiz_ids': passed_quiz_ids,
            'resume_at': resume_at,
            'require_sequential_progress': getattr(course, 'require_sequential_progress', False),
            'completed_lesson_ids': completed_lesson_ids,
            'lesson_positions': lesson_positions,
        }
        return Response(CourseProgressSerializer(data).data)


class InstructorStatsView(APIView):
    """GET /api/progress/instructor-stats/ – total students (enrolled in instructor's courses)."""

    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        total_students = (
            Enrollment.objects.filter(course__instructor=request.user)
            .values('user')
            .distinct()
            .count()
        )
        return Response({'total_students': total_students})


class DashboardView(APIView):
    """GET /api/progress/dashboard/ – student dashboard summary."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollments = Enrollment.objects.filter(user=user).select_related('course')

        courses_data = []
        completed_courses = 0

        for enrollment in enrollments:
            course = enrollment.course
            total_lessons = Lesson.objects.filter(module__course=course).count()
            completed_lessons = LessonProgress.objects.filter(
                user=user, lesson__module__course=course, completed=True,
            ).count()
            total_quizzes = course.modules.filter(quiz__isnull=False).count()
            quizzes_passed = user.quiz_attempts.filter(
                quiz__module__course=course, passed=True,
            ).values('quiz').distinct().count()

            progress_percent = round((completed_lessons / total_lessons) * 100, 1) if total_lessons > 0 else 0

            if progress_percent == 100:
                completed_courses += 1

            completed_ids = set(
                LessonProgress.objects.filter(
                    user=user, completed=True, lesson__module__course=course,
                ).values_list('lesson_id', flat=True)
            )
            resume_at = None
            for mod in course.modules.order_by('order'):
                for les in mod.lessons.order_by('order'):
                    if les.id not in completed_ids:
                        resume_at = {'module_id': mod.id, 'lesson_id': les.id}
                        break
                if resume_at:
                    break
            if not resume_at and total_lessons > 0:
                last_mod = course.modules.order_by('order').last()
                last_les = last_mod.lessons.order_by('order').last() if last_mod else None
                if last_les:
                    resume_at = {'module_id': last_mod.id, 'lesson_id': last_les.id}

            courses_data.append({
                'course_id': course.id,
                'course_title': course.title,
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'progress_percent': progress_percent,
                'quizzes_passed': quizzes_passed,
                'total_quizzes': total_quizzes,
                'resume_at': resume_at,
            })

        total_lessons_completed = LessonProgress.objects.filter(user=user, completed=True).count()
        total_quizzes_passed = user.quiz_attempts.filter(passed=True).values('quiz').distinct().count()
        certificates_earned = user.certificates.count()

        data = {
            'enrolled_courses': enrollments.count(),
            'completed_courses': completed_courses,
            'total_lessons_completed': total_lessons_completed,
            'total_quizzes_passed': total_quizzes_passed,
            'certificates_earned': certificates_earned,
            'courses': courses_data,
        }
        return Response(DashboardSerializer(data).data)
