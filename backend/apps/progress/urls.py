from django.urls import path

from . import views

urlpatterns = [
    path('admin/purchases/', views.AdminPurchasesView.as_view(), name='admin-purchases'),
    path('courses/<int:course_id>/enroll/', views.EnrollView.as_view(), name='enroll'),
    path('courses/<int:course_id>/purchase/', views.PurchaseView.as_view(), name='purchase'),
    path('courses/<int:course_id>/students/', views.CourseStudentsView.as_view(), name='course-students'),
    path('lessons/<int:lesson_id>/complete/', views.LessonCompleteView.as_view(), name='lesson-complete'),
    path('lessons/<int:lesson_id>/position/', views.LessonPositionUpdateView.as_view(), name='lesson-position'),
    path('progress/courses/<int:course_id>/', views.CourseProgressView.as_view(), name='course-progress'),
    path('progress/dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('progress/instructor-stats/', views.InstructorStatsView.as_view(), name='instructor-stats'),
]
