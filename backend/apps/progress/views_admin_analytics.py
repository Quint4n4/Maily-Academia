"""
Fase 8 - Analytics de Administrador.
Endpoints: revenue, users, courses, sections.
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdmin
from apps.users.models import User
from apps.courses.models import Course
from apps.progress.models import Purchase, Enrollment, LessonProgress
from apps.sections.models import SectionMembership


class AdminRevenueAnalyticsView(APIView):
    """GET /api/admin/analytics/revenue/?period=daily|weekly|monthly|yearly&section=&date_from=&date_to="""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        section_slug = request.query_params.get('section', '').strip()
        date_from = request.query_params.get('date_from', '')
        date_to = request.query_params.get('date_to', '')

        qs = Purchase.objects.filter(status=Purchase.Status.COMPLETED)
        if not date_from and not date_to:
            now = timezone.now()
            if period == 'daily':
                date_from = (now - timedelta(days=30)).strftime('%Y-%m-%d')
                date_to = now.strftime('%Y-%m-%d')
            elif period == 'weekly':
                date_from = (now - timedelta(weeks=12)).strftime('%Y-%m-%d')
                date_to = now.strftime('%Y-%m-%d')
            elif period == 'yearly':
                date_from = (now - timedelta(days=365*3)).strftime('%Y-%m-%d')
                date_to = now.strftime('%Y-%m-%d')
            else:
                date_from = (now - timedelta(days=365)).strftime('%Y-%m-%d')
                date_to = now.strftime('%Y-%m-%d')
        if date_from:
            try:
                from datetime import datetime
                qs = qs.filter(paid_at__date__gte=datetime.strptime(date_from, '%Y-%m-%d').date())
            except ValueError:
                pass
        if date_to:
            try:
                from datetime import datetime
                qs = qs.filter(paid_at__date__lte=datetime.strptime(date_to, '%Y-%m-%d').date())
            except ValueError:
                pass
        if section_slug:
            qs = qs.filter(course__section__slug=section_slug)

        if period == 'daily':
            qs = qs.annotate(period=TruncDay('paid_at'))
            date_format = '%d/%m/%Y'
        elif period == 'weekly':
            qs = qs.annotate(period=TruncWeek('paid_at'))
            date_format = '%d/%m'
        elif period == 'yearly':
            qs = qs.annotate(period=TruncYear('paid_at'))
            date_format = '%Y'
        else:
            period = 'monthly'
            qs = qs.annotate(period=TruncMonth('paid_at'))
            date_format = '%b %Y'

        agg = qs.values('period').annotate(
            revenue=Sum('amount'),
            purchases=Count('id'),
        ).order_by('period')

        total_revenue = qs.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        total_purchases = qs.count()

        data = []
        for row in agg:
            label = row['period'].strftime(date_format) if row['period'] else ''
            data.append({
                'label': label,
                'revenue': float(row['revenue']),
                'purchases': row['purchases'],
            })

        comparison = {'vs_previous_period': 'N/A', 'trend': 'up'}
        if data and period == 'monthly' and agg:
            try:
                last_period = list(agg)[-1]['period']
                if last_period:
                    year, month = last_period.year, last_period.month
                    if month == 1:
                        prev_start = timezone.datetime(year - 1, 12, 1, tzinfo=timezone.get_current_timezone())
                        prev_end = timezone.datetime(year, 1, 1, tzinfo=timezone.get_current_timezone())
                    else:
                        prev_start = timezone.datetime(year, month - 1, 1, tzinfo=timezone.get_current_timezone())
                        prev_end = timezone.datetime(year, month, 1, tzinfo=timezone.get_current_timezone())
                    prev_qs = Purchase.objects.filter(status=Purchase.Status.COMPLETED, paid_at__gte=prev_start, paid_at__lt=prev_end)
                    if section_slug:
                        prev_qs = prev_qs.filter(course__section__slug=section_slug)
                    prev_total = prev_qs.aggregate(t=Sum('amount'))['t'] or Decimal('0')
                    if prev_total and total_revenue:
                        pct = float((total_revenue - prev_total) / prev_total * 100)
                        comparison = {'vs_previous_period': f'{pct:+.1f}%', 'trend': 'up' if pct >= 0 else 'down'}
            except Exception:
                pass

        return Response({
            'period': period,
            'currency': 'MXN',
            'total_revenue': float(total_revenue),
            'total_purchases': total_purchases,
            'data': data,
            'comparison': comparison,
        })


class AdminUsersAnalyticsView(APIView):
    """GET /api/admin/analytics/users/"""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models.functions import TruncMonth

        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = now - timedelta(days=7)

        total_users = User.objects.count()
        new_this_month = User.objects.filter(date_joined__gte=this_month_start).count()
        active_7d = User.objects.filter(
            Q(lesson_progress__completed_at__gte=seven_days_ago) |
            Q(quiz_attempts__attempted_at__gte=seven_days_ago) |
            Q(activities__created_at__gte=seven_days_ago),
        ).distinct().count()

        users_by_role = dict(
            User.objects.values('role').annotate(c=Count('id')).values_list('role', 'c')
        )

        users_by_section = {}
        for m in SectionMembership.objects.filter(is_active=True).values('section__slug').annotate(c=Count('user', distinct=True)):
            if m['section__slug']:
                users_by_section[m['section__slug']] = m['c']

        users_by_country = list(
            User.objects.filter(profile__country__isnull=False).exclude(profile__country='')
            .values('profile__country').annotate(count=Count('id')).order_by('-count')[:15]
        )
        users_by_country = [{'country': x['profile__country'], 'count': x['count']} for x in users_by_country]

        reg_trend = list(
            User.objects.filter(date_joined__gte=now - timedelta(days=365))
            .annotate(month=TruncMonth('date_joined'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        registrations_trend = [{'label': x['month'].strftime('%b') if x['month'] else '', 'count': x['count']} for x in reg_trend[-12:]]

        return Response({
            'total_users': total_users,
            'new_users_this_month': new_this_month,
            'active_users_last_7d': active_7d,
            'users_by_role': users_by_role,
            'users_by_section': users_by_section,
            'users_by_country': users_by_country,
            'registrations_trend': registrations_trend,
        })


class AdminCoursesAnalyticsView(APIView):
    """GET /api/admin/analytics/courses/"""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total_courses = Course.objects.count()
        published = Course.objects.filter(status='published').count()
        total_enrollments = Enrollment.objects.count()

        completion_rates = []
        for c in Course.objects.filter(enrollments__isnull=False).distinct():
            total_lessons = LessonProgress.objects.filter(lesson__module__course=c).values('lesson').distinct().count()
            if total_lessons == 0:
                completion_rates.append(0)
            else:
                enrolled = Enrollment.objects.filter(course=c).count()
                completed = LessonProgress.objects.filter(
                    completed=True,
                    lesson__module__course=c,
                ).values('user').annotate(c=Count('lesson')).filter(c__gte=total_lessons).count()
                completion_rates.append((completed / enrolled * 100) if enrolled else 0)
        avg_completion = round(sum(completion_rates) / len(completion_rates), 1) if completion_rates else 0

        top_revenue = list(
            Purchase.objects.filter(status=Purchase.Status.COMPLETED)
            .values('course_id', 'course__title')
            .annotate(revenue=Sum('amount'), enrollments=Count('id'))
            .order_by('-revenue')[:10]
        )
        top_revenue = [{'id': x['course_id'], 'title': x['course__title'], 'revenue': float(x['revenue'] or 0), 'enrollments': x['enrollments']} for x in top_revenue]

        top_enrollments = list(
            Enrollment.objects.values('course_id', 'course__title')
            .annotate(enrollments=Count('id'))
            .order_by('-enrollments')[:10]
        )
        top_enrollments = [{'id': x['course_id'], 'title': x['course__title'], 'enrollments': x['enrollments']} for x in top_enrollments]

        courses_by_category = list(
            Course.objects.filter(category__isnull=False)
            .values('category__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        courses_by_category = [{'category': x['category__name'] or 'Sin categoría', 'count': x['count']} for x in courses_by_category]

        return Response({
            'total_courses': total_courses,
            'published_courses': published,
            'total_enrollments': total_enrollments,
            'avg_completion_rate': avg_completion,
            'top_courses_by_revenue': top_revenue,
            'top_courses_by_enrollments': top_enrollments,
            'courses_by_category': courses_by_category,
        })


class AdminSectionAnalyticsView(APIView):
    """GET /api/admin/analytics/sections/ — Resumen de métricas por academia."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.sections.models import Section
        from decimal import Decimal

        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        sections = Section.objects.filter(is_active=True).order_by('name')
        result = []

        for section in sections:
            users_count = (
                SectionMembership.objects
                .filter(section=section, is_active=True)
                .values('user')
                .distinct()
                .count()
            )
            instructors_count = SectionMembership.objects.filter(
                section=section,
                is_active=True,
                role=SectionMembership.Role.INSTRUCTOR,
            ).count()
            published_courses = Course.objects.filter(
                section=section, status='published'
            ).count()
            total_courses = Course.objects.filter(section=section).count()
            revenue_month = (
                Purchase.objects
                .filter(
                    status=Purchase.Status.COMPLETED,
                    course__section=section,
                    paid_at__gte=this_month_start,
                )
                .aggregate(t=Sum('amount'))['t'] or Decimal('0')
            )
            total_enrollments = Enrollment.objects.filter(
                course__section=section
            ).count()

            result.append({
                'slug': section.slug,
                'name': section.name,
                'section_type': section.section_type,
                'users': users_count,
                'instructors': instructors_count,
                'published_courses': published_courses,
                'total_courses': total_courses,
                'revenue_this_month': float(revenue_month),
                'total_enrollments': total_enrollments,
            })

        return Response({'sections': result})
