from django.urls import path

from . import views
from . import views_admin_analytics

urlpatterns = [
    path('admin/purchases/', views.AdminPurchasesView.as_view(), name='admin-purchases'),
    path('admin/analytics/revenue/', views_admin_analytics.AdminRevenueAnalyticsView.as_view(), name='admin-analytics-revenue'),
    path('admin/analytics/users/', views_admin_analytics.AdminUsersAnalyticsView.as_view(), name='admin-analytics-users'),
    path('admin/analytics/courses/', views_admin_analytics.AdminCoursesAnalyticsView.as_view(), name='admin-analytics-courses'),
    path('admin/analytics/sections/', views_admin_analytics.AdminSectionAnalyticsView.as_view(), name='admin-analytics-sections'),
    path('courses/<int:course_id>/enroll/', views.EnrollView.as_view(), name='enroll'),
    path('courses/<int:course_id>/purchase/', views.PurchaseView.as_view(), name='purchase'),
    path('courses/<int:course_id>/students/', views.CourseStudentsView.as_view(), name='course-students'),
    path('lessons/<int:lesson_id>/complete/', views.LessonCompleteView.as_view(), name='lesson-complete'),
    path('lessons/<int:lesson_id>/position/', views.LessonPositionUpdateView.as_view(), name='lesson-position'),
    path('progress/courses/<int:course_id>/', views.CourseProgressView.as_view(), name='course-progress'),
    path('progress/dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('progress/instructor-stats/', views.InstructorStatsView.as_view(), name='instructor-stats'),
]
