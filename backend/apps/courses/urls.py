from django.urls import path

from . import views

urlpatterns = [
    # Courses
    path('', views.CourseListCreateView.as_view(), name='course-list-create'),
    path('recommended/', views.RecommendedCoursesView.as_view(), name='course-recommended'),
    path('upload-thumbnail/', views.UploadThumbnailView.as_view(), name='upload-thumbnail'),
    path('<int:pk>/', views.CourseDetailView.as_view(), name='course-detail'),
    # Materials (by course)
    path('<int:course_id>/materials/', views.CourseMaterialListCreateView.as_view(), name='course-material-list-create'),
    # Modules
    path('<int:course_id>/modules/', views.ModuleCreateView.as_view(), name='module-create'),
    path('<int:course_id>/modules/reorder/', views.reorder_modules, name='module-reorder'),
    path('modules/<int:pk>/', views.ModuleDetailView.as_view(), name='module-detail'),
    # Lessons
    path('modules/<int:module_id>/lessons/', views.LessonCreateView.as_view(), name='lesson-create'),
    path('modules/<int:module_id>/lessons/reorder/', views.reorder_lessons, name='lesson-reorder'),
    path('lessons/<int:pk>/', views.LessonDetailView.as_view(), name='lesson-detail'),
]
