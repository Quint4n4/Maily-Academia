"""Admin user-management URL patterns: /api/users/..."""
from django.urls import path

from . import views

urlpatterns = [
    path('', views.UserListView.as_view(), name='user-list'),
    path('instructors/', views.InstructorCreateView.as_view(), name='instructor-create'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/change-password/', views.AdminChangePasswordView.as_view(), name='user-change-password'),
    path('<int:pk>/unlock/', views.AdminUnlockAccountView.as_view(), name='user-unlock'),
]
