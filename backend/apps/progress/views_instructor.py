"""
Fase 7 - Panel Avanzado del Instructor.
Endpoints: students list, student detail, activity, progress, certificates, submissions (stub), course analytics.

Fase 5 (Analytics Avanzados) - endpoints adicionales:
  - analytics/revenue/      → Ingresos con rango de fechas y agrupación
  - analytics/trends/       → Tendencias comparativas mes actual vs anterior
  - analytics/instructors/  → Analytics por instructor (solo admin)
  - analytics/engagement/   → Métricas de engagement por curso
  - analytics/dropout/      → Análisis de abandono por lección
"""
from datetime import timedelta

from django.db.models import Count, Q, Avg, Sum, DecimalField, FloatField
from django.db.models.functions import Coalesce, TruncDay, TruncWeek, TruncMonth
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

from apps.progress.models import Enrollment, LessonProgress, UserActivity, Purchase


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


class InstructorRevenueView(APIView):
    """GET /api/instructor/revenue/ – revenue summary for instructor's courses."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request):
        cids = list(instructor_course_ids(request))
        purchases = Purchase.objects.filter(
            course_id__in=cids,
            status='completed',
        )
        total_revenue = purchases.aggregate(
            total=Coalesce(Sum('amount'), 0, output_field=DecimalField()),
        )['total']
        total_sales = purchases.count()

        # Per-course breakdown
        per_course = (
            purchases
            .values('course_id', 'course__title')
            .annotate(revenue=Sum('amount'), sales=Count('id'))
            .order_by('-revenue')
        )
        courses_data = [
            {
                'course_id': row['course_id'],
                'course_title': row['course__title'] or '',
                'revenue': float(row['revenue'] or 0),
                'sales': row['sales'],
            }
            for row in per_course
        ]

        return Response({
            'total_revenue': float(total_revenue),
            'total_sales': total_sales,
            'currency': 'mxn',
            'courses': courses_data,
        })


# ---------------------------------------------------------------------------
# Fase 5 — Analytics Avanzados
# ---------------------------------------------------------------------------

def _safe_percent(numerador, denominador):
    """Calcula porcentaje evitando división por cero. Retorna float."""
    if not denominador:
        return 0.0
    return round((numerador / denominador) * 100, 1)


def _change_percent(actual, anterior):
    """Calcula variación porcentual entre dos períodos. Retorna None si anterior es 0."""
    if not anterior:
        return None
    return round(((actual - anterior) / anterior) * 100, 1)


class AnalyticsRevenueView(APIView):
    """
    GET /api/instructor/analytics/revenue/
    Ingresos con rango de fechas, agrupación por día/semana/mes
    y comparación con el período anterior.

    Parámetros:
      start_date  (YYYY-MM-DD, requerido)
      end_date    (YYYY-MM-DD, requerido)
      course_id   (int, opcional)
      group_by    (day|week|month, default=day)
    """

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request):
        from datetime import date as date_type
        import datetime

        # --- Validar parámetros de fecha ---
        start_str = request.query_params.get('start_date', '').strip()
        end_str = request.query_params.get('end_date', '').strip()
        if not start_str or not end_str:
            return Response(
                {'detail': 'Los parámetros start_date y end_date son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            start_date = datetime.datetime.strptime(start_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Formato de fecha inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_date > end_date:
            return Response(
                {'detail': 'start_date debe ser anterior o igual a end_date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (end_date - start_date).days > 365:
            return Response(
                {'detail': 'El rango máximo permitido es de 1 año.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group_by = request.query_params.get('group_by', 'day').lower()
        if group_by not in ('day', 'week', 'month'):
            group_by = 'day'

        trunc_map = {'day': TruncDay, 'week': TruncWeek, 'month': TruncMonth}
        TruncFunc = trunc_map[group_by]

        # --- Filtrar cursos según rol ---
        cids = list(instructor_course_ids(request))
        course_id = request.query_params.get('course_id')
        if course_id:
            try:
                cid = int(course_id)
            except ValueError:
                return Response({'detail': 'course_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            if request.user.role != 'admin':
                if cid not in cids:
                    return Response({'detail': 'No autorizado para este curso.'}, status=status.HTTP_403_FORBIDDEN)
            cids = [cid]

        # Convertir fechas a datetime con timezone para el ORM
        start_dt = timezone.make_aware(datetime.datetime.combine(start_date, datetime.time.min))
        end_dt = timezone.make_aware(datetime.datetime.combine(end_date, datetime.time.max))

        # --- Período actual ---
        qs_actual = Purchase.objects.filter(
            course_id__in=cids,
            status='completed',
            created_at__range=(start_dt, end_dt),
        )
        total_revenue = float(
            qs_actual.aggregate(t=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['t']
        )

        # Agrupación temporal
        serie = (
            qs_actual
            .annotate(periodo=TruncFunc('created_at'))
            .values('periodo')
            .annotate(revenue=Sum('amount'), purchases=Count('id'))
            .order_by('periodo')
        )
        data = []
        for row in serie:
            fecha = row['periodo']
            if group_by == 'month':
                label = fecha.strftime('%Y-%m') if fecha else ''
            elif group_by == 'week':
                label = fecha.strftime('%Y-%W') if fecha else ''
            else:
                label = fecha.strftime('%Y-%m-%d') if fecha else ''
            data.append({
                'date': label,
                'revenue': float(row['revenue'] or 0),
                'purchases': row['purchases'],
            })

        # --- Período anterior (misma duración, justo antes de start_date) ---
        delta = end_dt - start_dt
        prev_end_dt = start_dt - timedelta(seconds=1)
        prev_start_dt = prev_end_dt - delta

        qs_anterior = Purchase.objects.filter(
            course_id__in=cids,
            status='completed',
            created_at__range=(prev_start_dt, prev_end_dt),
        )
        prev_revenue = float(
            qs_anterior.aggregate(t=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['t']
        )
        cambio = _change_percent(total_revenue, prev_revenue)

        return Response({
            'total_revenue': total_revenue,
            'currency': 'MXN',
            'period': {'start': start_str, 'end': end_str},
            'data': data,
            'comparison': {
                'previous_period_revenue': prev_revenue,
                'change_percent': cambio,
            },
        })


class AnalyticsTrendsView(APIView):
    """
    GET /api/instructor/analytics/trends/
    Tendencias comparativas: mes actual vs mes anterior y datos de los últimos 6 meses.

    Parámetros:
      course_id  (int, opcional)
    """

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request):
        import datetime

        cids = list(instructor_course_ids(request))
        course_id = request.query_params.get('course_id')
        if course_id:
            try:
                cid = int(course_id)
            except ValueError:
                return Response({'detail': 'course_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            if request.user.role != 'admin':
                if cid not in cids:
                    return Response({'detail': 'No autorizado para este curso.'}, status=status.HTTP_403_FORBIDDEN)
            cids = [cid]

        ahora = timezone.now()

        # Inicio del mes actual y del mes anterior
        inicio_mes_actual = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if inicio_mes_actual.month == 1:
            inicio_mes_anterior = inicio_mes_actual.replace(year=inicio_mes_actual.year - 1, month=12)
        else:
            inicio_mes_anterior = inicio_mes_actual.replace(month=inicio_mes_actual.month - 1)
        fin_mes_anterior = inicio_mes_actual - timedelta(seconds=1)

        def metricas_periodo(start, end):
            """Calcula las cuatro métricas clave para un período dado."""
            revenue = float(
                Purchase.objects.filter(
                    course_id__in=cids,
                    status='completed',
                    created_at__range=(start, end),
                ).aggregate(t=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['t']
            )
            enrollments = Enrollment.objects.filter(
                course_id__in=cids,
                enrolled_at__range=(start, end),
            ).count()
            # Completaron todas las lecciones de al menos un curso del conjunto
            completions = 0
            for cid_item in cids:
                try:
                    curso = Course.objects.get(pk=cid_item)
                except Course.DoesNotExist:
                    continue
                total_l = Lesson.objects.filter(module__course=curso).count()
                if total_l == 0:
                    continue
                enrolled_users = Enrollment.objects.filter(
                    course=curso,
                    enrolled_at__lte=end,
                ).values_list('user_id', flat=True)
                for uid in enrolled_users:
                    compl = LessonProgress.objects.filter(
                        user_id=uid,
                        completed=True,
                        lesson__module__course=curso,
                        completed_at__range=(start, end),
                    ).count()
                    if compl >= total_l:
                        completions += 1

            # Estudiantes activos: completaron al menos 1 lección en el período
            active_students = LessonProgress.objects.filter(
                lesson__module__course_id__in=cids,
                completed=True,
                completed_at__range=(start, end),
            ).values('user').distinct().count()

            return {
                'revenue': revenue,
                'enrollments': enrollments,
                'completions': completions,
                'active_students': active_students,
            }

        actual = metricas_periodo(inicio_mes_actual, ahora)
        anterior = metricas_periodo(inicio_mes_anterior, fin_mes_anterior)

        changes = {
            'revenue_change_percent': _change_percent(actual['revenue'], anterior['revenue']),
            'enrollments_change_percent': _change_percent(actual['enrollments'], anterior['enrollments']),
            'completions_change_percent': _change_percent(actual['completions'], anterior['completions']),
            'active_students_change_percent': _change_percent(actual['active_students'], anterior['active_students']),
        }

        # --- Datos mensuales últimos 6 meses ---
        monthly_data = []
        for i in range(5, -1, -1):
            # Retroceder i meses desde el mes actual
            mes_ref = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            for _ in range(i):
                if mes_ref.month == 1:
                    mes_ref = mes_ref.replace(year=mes_ref.year - 1, month=12)
                else:
                    mes_ref = mes_ref.replace(month=mes_ref.month - 1)

            # Fin del mes de referencia
            if mes_ref.month == 12:
                fin_mes_ref = mes_ref.replace(year=mes_ref.year + 1, month=1) - timedelta(seconds=1)
            else:
                fin_mes_ref = mes_ref.replace(month=mes_ref.month + 1) - timedelta(seconds=1)

            rev = float(
                Purchase.objects.filter(
                    course_id__in=cids,
                    status='completed',
                    created_at__range=(mes_ref, fin_mes_ref),
                ).aggregate(t=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['t']
            )
            enr = Enrollment.objects.filter(
                course_id__in=cids,
                enrolled_at__range=(mes_ref, fin_mes_ref),
            ).count()
            monthly_data.append({
                'month': mes_ref.strftime('%Y-%m'),
                'revenue': rev,
                'enrollments': enr,
            })

        return Response({
            'current_month': actual,
            'previous_month': anterior,
            'changes': changes,
            'monthly_data': monthly_data,
        })


class AnalyticsInstructorsView(APIView):
    """
    GET /api/instructor/analytics/instructors/
    Analytics agregados por instructor. Solo accesible por administradores.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Solo los administradores pueden acceder a este endpoint.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        instructores = User.objects.filter(role='instructor')
        resultado = []

        for instructor in instructores:
            cursos = Course.objects.filter(instructor=instructor)
            cursos_ids = list(cursos.values_list('id', flat=True))
            cursos_count = len(cursos_ids)

            total_students = (
                Enrollment.objects.filter(course_id__in=cursos_ids)
                .values('user')
                .distinct()
                .count()
            )

            # Alumnos activos: completaron al menos 1 lección en los últimos 30 días
            hace_30 = timezone.now() - timedelta(days=30)
            active_students = (
                LessonProgress.objects.filter(
                    lesson__module__course_id__in=cursos_ids,
                    completed=True,
                    completed_at__gte=hace_30,
                )
                .values('user')
                .distinct()
                .count()
            )

            total_revenue = float(
                Purchase.objects.filter(
                    course_id__in=cursos_ids,
                    status='completed',
                ).aggregate(t=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['t']
            )

            # Tasa media de completitud en todos los cursos del instructor
            tasas = []
            for curso in cursos:
                enrolled = Enrollment.objects.filter(course=curso).count()
                if enrolled == 0:
                    continue
                total_l = Lesson.objects.filter(module__course=curso).count()
                if total_l == 0:
                    continue
                completados = sum(
                    1 for uid in Enrollment.objects.filter(course=curso).values_list('user_id', flat=True)
                    if LessonProgress.objects.filter(
                        user_id=uid,
                        completed=True,
                        lesson__module__course=curso,
                    ).count() >= total_l
                )
                tasas.append(_safe_percent(completados, enrolled))
            avg_completion = round(sum(tasas) / len(tasas), 1) if tasas else 0.0

            # Curso con más inscripciones
            top_course_data = None
            if cursos_ids:
                top = (
                    Enrollment.objects.filter(course_id__in=cursos_ids)
                    .values('course_id', 'course__title')
                    .annotate(cnt=Count('id'))
                    .order_by('-cnt')
                    .first()
                )
                if top:
                    top_course_data = {
                        'id': top['course_id'],
                        'title': top['course__title'] or '',
                        'enrollments': top['cnt'],
                    }

            resultado.append({
                'id': instructor.id,
                'name': instructor.get_full_name() or instructor.email,
                'email': instructor.email,
                'courses_count': cursos_count,
                'total_students': total_students,
                'active_students': active_students,
                'total_revenue': total_revenue,
                'avg_completion_rate': avg_completion,
                'top_course': top_course_data,
            })

        return Response({'instructors': resultado})


class AnalyticsEngagementView(APIView):
    """
    GET /api/instructor/analytics/engagement/?course_id=<id>
    Métricas de engagement por módulo y lección para un curso.

    Parámetro requerido: course_id
    """

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request):
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response(
                {'detail': 'El parámetro course_id es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            cid = int(course_id)
        except ValueError:
            return Response({'detail': 'course_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(pk=cid)
        except Course.DoesNotExist:
            return Response({'detail': 'Curso no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != 'admin' and course.instructor_id != request.user.id:
            return Response({'detail': 'No autorizado para este curso.'}, status=status.HTTP_403_FORBIDDEN)

        total_enrolled = Enrollment.objects.filter(course=course).count()

        modules_data = []
        for modulo in course.modules.order_by('order'):
            lecciones = modulo.lessons.order_by('order')
            lessons_data = []
            for leccion in lecciones:
                completions_count = LessonProgress.objects.filter(
                    lesson=leccion, completed=True,
                ).count()
                rate = _safe_percent(completions_count, total_enrolled)
                lessons_data.append({
                    'id': leccion.id,
                    'title': leccion.title,
                    'order': leccion.order,
                    'completion_rate': rate,
                    'completions': completions_count,
                    'total_enrolled': total_enrolled,
                })

            # Tasa promedio del módulo
            if lessons_data:
                avg_mod = round(sum(l['completion_rate'] for l in lessons_data) / len(lessons_data), 1)
            else:
                avg_mod = 0.0

            modules_data.append({
                'id': modulo.id,
                'title': modulo.title,
                'lessons_count': lecciones.count(),
                'avg_completion_rate': avg_mod,
                'lessons': lessons_data,
            })

        # Tasa de completitud global del curso
        all_rates = [l['completion_rate'] for mod in modules_data for l in mod['lessons']]
        avg_global = round(sum(all_rates) / len(all_rates), 1) if all_rates else 0.0

        return Response({
            'course': {'id': course.id, 'title': course.title},
            'avg_completion_rate': avg_global,
            'modules': modules_data,
        })


class AnalyticsDropoutView(APIView):
    """
    GET /api/instructor/analytics/dropout/?course_id=<id>
    Análisis de abandono por lección para un curso.
    Muestra cuántos alumnos llegaron a cada lección y cuántos la abandonaron.

    Parámetro requerido: course_id
    """

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get(self, request):
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response(
                {'detail': 'El parámetro course_id es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            cid = int(course_id)
        except ValueError:
            return Response({'detail': 'course_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(pk=cid)
        except Course.DoesNotExist:
            return Response({'detail': 'Curso no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != 'admin' and course.instructor_id != request.user.id:
            return Response({'detail': 'No autorizado para este curso.'}, status=status.HTTP_403_FORBIDDEN)

        total_enrolled = Enrollment.objects.filter(course=course).count()

        # Alumnos que completaron el 100% de las lecciones
        total_lessons = Lesson.objects.filter(module__course=course).count()
        total_completed = 0
        if total_lessons > 0:
            for uid in Enrollment.objects.filter(course=course).values_list('user_id', flat=True):
                if LessonProgress.objects.filter(
                    user_id=uid,
                    completed=True,
                    lesson__module__course=course,
                ).count() >= total_lessons:
                    total_completed += 1

        overall_dropout = _safe_percent(total_enrolled - total_completed, total_enrolled)

        # Construir lista ordenada de lecciones (todos los módulos en orden)
        lecciones_ordenadas = []
        for modulo in course.modules.order_by('order'):
            for leccion in modulo.lessons.order_by('order'):
                lecciones_ordenadas.append((modulo, leccion))

        dropout_by_lesson = []
        prev_reached = total_enrolled  # Para la primera lección, el punto de partida es el total

        for idx, (modulo, leccion) in enumerate(lecciones_ordenadas):
            students_reached = prev_reached
            completions_this = LessonProgress.objects.filter(
                lesson=leccion, completed=True,
            ).count()
            students_dropped = max(0, students_reached - completions_this)
            dropout_rate = _safe_percent(students_dropped, students_reached)

            dropout_by_lesson.append({
                'lesson_id': leccion.id,
                'lesson_title': leccion.title,
                'lesson_order': leccion.order,
                'module_title': modulo.title,
                'students_reached': students_reached,
                'students_dropped': students_dropped,
                'dropout_rate': dropout_rate,
            })

            # El siguiente punto de partida son los que completaron esta lección
            prev_reached = completions_this

        # Lección con mayor tasa de abandono
        biggest_dropoff = None
        if dropout_by_lesson:
            peor = max(dropout_by_lesson, key=lambda x: x['dropout_rate'])
            biggest_dropoff = {
                'lesson_id': peor['lesson_id'],
                'lesson_title': peor['lesson_title'],
                'dropout_rate': peor['dropout_rate'],
            }

        return Response({
            'course': {'id': course.id, 'title': course.title},
            'total_enrolled': total_enrolled,
            'total_completed': total_completed,
            'overall_dropout_rate': overall_dropout,
            'dropout_by_lesson': dropout_by_lesson,
            'biggest_dropoff': biggest_dropoff,
        })
