"""
Fase 7 - Panel Avanzado del Instructor.
Endpoints: students list, student detail, activity, progress, certificates, submissions (stub), course analytics.
"""
from django.db.models import Count, Q, Avg
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course, Lesson
from apps.certificates.models import Certificate
from apps.quizzes.models import QuizAttempt
from apps.users.models import User
from apps.users.permissions import IsAdminOrInstructor

from apps.progress.models import Enrollment, LessonProgress, UserActivity


def instructor_course_ids(request):
    """Course IDs for the current instructor (or all if admin)."""
    if request.user.role == 'admin':
        return Course.objects.values_list('id', flat=True)
    return Course.objects.filter(instructor=request.user).values_list('id', flat=True)


def get_instructor_students_queryset(request):
    """Students enrolled in instructor's courses (distinct users)."""
    cids = list(instructor_course_ids(request))
    if not cids:
        return User.objects.none()
    return User.objects.filter(
        enrollments__course_id__in=cids,
        role='student',
    ).distinct().select_related('profile')


class InstructorStudentListView(generics.ListAPIView):
    """GET /api/instructor/students/ – list students enrolled in instructor's courses."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get_queryset(self):
        qs = get_instructor_students_queryset(self.request)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        course_id = self.request.query_params.get('course')
        if course_id:
            try:
                cid = int(course_id)
                if cid in list(instructor_course_ids(self.request)):
                    qs = qs.filter(enrollments__course_id=cid)
            except ValueError:
                pass
        return qs.order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is None:
            page = list(qs[:50])
            paginated = False
        else:
            page = list(page)
            paginated = True
        cids = list(instructor_course_ids(request))

        def row(u):
            name = (u.get_full_name() or u.email or '').strip() or u.email
            try:
                country = u.profile.country or ''
                avatar = u.profile.avatar.url if u.profile.avatar else None
            except Exception:
                country = ''
                avatar = None
            courses_enrolled = Enrollment.objects.filter(user=u, course_id__in=cids).count()
            last_activity = UserActivity.objects.filter(user=u).order_by('-created_at').values_list('created_at', flat=True).first()
            return {
                'id': u.id,
                'name': name,
                'email': u.email,
                'avatar': avatar,
                'country': country,
                'date_joined': u.date_joined.isoformat() if u.date_joined else None,
                'courses_enrolled': courses_enrolled,
                'last_activity': last_activity.isoformat() if last_activity else None,
            }

        data = [row(u) for u in page]
        if paginated:
            return self.get_paginated_response(data)
        return Response(data)


class InstructorStudentDetailView(APIView):
    """GET /api/instructor/students/{id}/ – student profile and summary."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request, pk):
        cids = list(instructor_course_ids(request))
        if not cids:
            return Response({'detail': 'No courses.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            student = User.objects.select_related('profile').get(pk=pk, role='student')
        except User.DoesNotExist:
            return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not Enrollment.objects.filter(user=student, course_id__in=cids).exists():
            return Response({'detail': 'El alumno no está inscrito en ninguno de tus cursos.'}, status=status.HTTP_404_NOT_FOUND)

        enrollments = Enrollment.objects.filter(user=student, course_id__in=cids).select_related('course')
        courses_enrolled = enrollments.count()
        completed_lessons = LessonProgress.objects.filter(
            user=student,
            completed=True,
            lesson__module__course_id__in=cids,
        ).count()
        total_lessons = Lesson.objects.filter(module__course_id__in=cids).count()
        quizzes_passed = QuizAttempt.objects.filter(
            user=student,
            passed=True,
            quiz__module__course_id__in=cids,
        ).values('quiz').distinct().count()
        from apps.quizzes.models import Quiz
        total_quizzes = Quiz.objects.filter(module__course_id__in=cids).count()
        certificates_earned = Certificate.objects.filter(user=student, course_id__in=cids).count()
        last_activity = UserActivity.objects.filter(user=student).order_by('-created_at').values_list('created_at', flat=True).first()
        avg_quiz_score = QuizAttempt.objects.filter(
            user=student,
            quiz__module__course_id__in=cids,
        ).aggregate(avg=Avg('score'))['avg']

        courses_completed = 0
        for e in enrollments:
            total_l = Lesson.objects.filter(module__course=e.course).count()
            completed_l = LessonProgress.objects.filter(user=student, completed=True, lesson__module__course=e.course).count()
            total_q = e.course.modules.filter(quiz__isnull=False).count()
            passed_q = QuizAttempt.objects.filter(user=student, passed=True, quiz__module__course=e.course).values('quiz').distinct().count()
            if total_l > 0 and completed_l >= total_l and (total_q == 0 or passed_q >= total_q):
                courses_completed += 1

        try:
            profile = student.profile
            country = profile.country or ''
            avatar = profile.avatar.url if profile.avatar else None
            occupation_type = getattr(profile, 'occupation_type', '') or ''
        except Exception:
            country = ''
            avatar = None
            occupation_type = ''

        courses_list = []
        for e in enrollments:
            course = e.course
            total_l = Lesson.objects.filter(module__course=course).count()
            completed_l = LessonProgress.objects.filter(user=student, completed=True, lesson__module__course=course).count()
            total_q = course.modules.filter(quiz__isnull=False).count()
            passed_q = QuizAttempt.objects.filter(user=student, passed=True, quiz__module__course=course).values('quiz').distinct().count()
            progress_pct = round((completed_l / total_l) * 100, 1) if total_l > 0 else 0
            last_les = LessonProgress.objects.filter(
                user=student,
                lesson__module__course=course,
                completed=True,
            ).order_by('-completed_at').values_list('completed_at', flat=True).first()
            courses_list.append({
                'course_id': course.id,
                'course_title': course.title,
                'enrolled_at': e.enrolled_at.isoformat() if e.enrolled_at else None,
                'progress_percent': progress_pct,
                'lessons_completed': completed_l,
                'lessons_total': total_l,
                'quizzes_passed': passed_q,
                'quizzes_total': total_q,
                'last_lesson_at': last_les.date().isoformat() if last_les else None,
            })

        return Response({
            'student': {
                'id': student.id,
                'name': student.get_full_name() or student.email,
                'email': student.email,
                'avatar': avatar,
                'country': country,
                'occupation_type': occupation_type,
                'date_joined': student.date_joined.isoformat() if student.date_joined else None,
            },
            'summary': {
                'courses_enrolled': courses_enrolled,
                'courses_completed': courses_completed,
                'lessons_completed': completed_lessons,
                'quizzes_passed': quizzes_passed,
                'certificates_earned': certificates_earned,
                'last_activity': last_activity.isoformat() if last_activity else None,
                'avg_quiz_score': round(avg_quiz_score, 1) if avg_quiz_score is not None else None,
            },
            'courses': courses_list,
        })


class InstructorStudentActivityView(APIView):
    """GET /api/instructor/students/{id}/activity/ – recent activity for a student."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request, pk):
        cids = list(instructor_course_ids(request))
        if not cids:
            return Response([])
        try:
            student = User.objects.get(pk=pk, role='student')
        except User.DoesNotExist:
            return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not Enrollment.objects.filter(user=student, course_id__in=cids).exists():
            return Response([])

        activities = UserActivity.objects.filter(user=student).order_by('-created_at')[:50]
        out = []
        for a in activities:
            meta = a.metadata or {}
            if a.resource_type == 'course' and a.resource_id and a.resource_id not in cids:
                continue
            if a.resource_type == 'lesson' and meta.get('course_id') and meta['course_id'] not in cids:
                continue
            if a.resource_type == 'quiz' and meta.get('quiz_id'):
                from apps.quizzes.models import Quiz
                try:
                    q = Quiz.objects.get(pk=meta['quiz_id'])
                    if q.module.course_id not in cids:
                        continue
                except Exception:
                    continue
            out.append({
                'action': a.action,
                'resource_type': a.resource_type,
                'resource_id': a.resource_id,
                'metadata': meta,
                'created_at': a.created_at.isoformat(),
            })
        return Response(out[:30])


class InstructorStudentCertificatesView(APIView):
    """GET /api/instructor/students/{id}/certificates/ – certificates in instructor's courses."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request, pk):
        cids = list(instructor_course_ids(request))
        try:
            student = User.objects.get(pk=pk, role='student')
        except User.DoesNotExist:
            return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        certs = Certificate.objects.filter(user=student, course_id__in=cids).select_related('course')
        return Response([{
            'id': c.id,
            'course_id': c.course_id,
            'course_title': c.course.title,
            'verification_code': str(c.verification_code),
            'issued_at': c.issued_at.isoformat(),
        } for c in certs])


class InstructorStudentSubmissionsView(APIView):
    """GET /api/instructor/students/{id}/submissions/ – stub (Fase 6 skipped)."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request, pk):
        return Response([])


class InstructorCourseAnalyticsView(APIView):
    """GET /api/instructor/courses/{id}/analytics/ – analytics for one course."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != 'admin' and course.instructor_id != request.user.id:
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Avg

        students_enrolled = Enrollment.objects.filter(course=course).count()
        total_lessons = Lesson.objects.filter(module__course=course).count()

        seven_days_ago = timezone.now() - timezone.timedelta(days=7)
        recent_user_ids = set(
            UserActivity.objects.filter(
                resource_type='lesson',
                created_at__gte=seven_days_ago,
            ).values_list('user_id', flat=True).distinct()
        )
        students_active_7d = sum(
            1 for uid in recent_user_ids
            if Enrollment.objects.filter(user_id=uid, course=course).exists()
        )

        completed_per_user = LessonProgress.objects.filter(
            completed=True,
            lesson__module__course=course,
        ).values('user').annotate(c=Count('id'))
        students_completed = sum(1 for x in completed_per_user if x['c'] >= total_lessons) if total_lessons > 0 else 0

        completion_rate = round((students_completed / students_enrolled) * 100, 1) if students_enrolled > 0 else 0

        avg_quiz_score = QuizAttempt.objects.filter(
            quiz__module__course=course,
        ).aggregate(avg=Avg('score'))['avg']
        avg_quiz_score = round(avg_quiz_score, 1) if avg_quiz_score is not None else None

        module_completion = []
        for mod in course.modules.order_by('order'):
            mod_lessons = Lesson.objects.filter(module=mod).count()
            if mod_lessons == 0:
                module_completion.append({'module_id': mod.id, 'title': mod.title, 'completion_rate': 0})
                continue
            completed_in_mod = LessonProgress.objects.filter(
                completed=True,
                lesson__module=mod,
            ).values('user').annotate(c=Count('id'))
            completed_count = sum(1 for x in completed_in_mod if x['c'] >= mod_lessons)
            rate = round((completed_count / students_enrolled) * 100, 1) if students_enrolled > 0 else 0
            module_completion.append({'module_id': mod.id, 'title': mod.title, 'completion_rate': rate})

        dropout_points = []
        for mod in course.modules.order_by('order'):
            for les in mod.lessons.order_by('order'):
                started = LessonProgress.objects.filter(lesson=les, completed=True).count()
                prev_les = list(mod.lessons.filter(order__lt=les.order).order_by('order'))
                if not prev_les:
                    prev_completed = students_enrolled
                else:
                    last_prev = prev_les[-1]
                    prev_completed = LessonProgress.objects.filter(lesson=last_prev, completed=True).count()
                dropout = prev_completed - started
                if dropout > 0:
                    dropout_points.append({
                        'lesson_id': les.id,
                        'title': les.title,
                        'dropout_count': dropout,
                    })
        dropout_points.sort(key=lambda x: -x['dropout_count'])
        dropout_points = dropout_points[:10]

        return Response({
            'course': {'id': course.id, 'title': course.title},
            'students_enrolled': students_enrolled,
            'students_active_last_7d': students_active_7d,
            'students_completed': students_completed,
            'completion_rate': completion_rate,
            'avg_quiz_score': avg_quiz_score,
            'avg_time_to_complete_days': None,
            'module_completion': module_completion,
            'dropout_points': dropout_points,
        })
