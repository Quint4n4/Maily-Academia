"""Fase 7 - Instructor panel URLs. Fase 5 - Analytics avanzados."""
from django.urls import path
from . import views_instructor

urlpatterns = [
    path('students/', views_instructor.InstructorStudentListView.as_view(), name='instructor-students'),
    path('students/<int:pk>/', views_instructor.InstructorStudentDetailView.as_view(), name='instructor-student-detail'),
    path('students/<int:pk>/activity/', views_instructor.InstructorStudentActivityView.as_view(), name='instructor-student-activity'),
    path('students/<int:pk>/certificates/', views_instructor.InstructorStudentCertificatesView.as_view(), name='instructor-student-certificates'),
    path('students/<int:pk>/submissions/', views_instructor.InstructorStudentSubmissionsView.as_view(), name='instructor-student-submissions'),
    path('courses/<int:pk>/analytics/', views_instructor.InstructorCourseAnalyticsView.as_view(), name='instructor-course-analytics'),
    path('revenue/', views_instructor.InstructorRevenueView.as_view(), name='instructor-revenue'),

    # --- Fase 5: Analytics Avanzados ---
    path('analytics/revenue/', views_instructor.AnalyticsRevenueView.as_view(), name='analytics-revenue'),
    path('analytics/trends/', views_instructor.AnalyticsTrendsView.as_view(), name='analytics-trends'),
    path('analytics/instructors/', views_instructor.AnalyticsInstructorsView.as_view(), name='analytics-instructors'),
    path('analytics/engagement/', views_instructor.AnalyticsEngagementView.as_view(), name='analytics-engagement'),
    path('analytics/dropout/', views_instructor.AnalyticsDropoutView.as_view(), name='analytics-dropout'),
]
