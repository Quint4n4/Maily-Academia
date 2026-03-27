"""Admin user-management URL patterns: /api/users/..."""
from django.urls import path

from . import views
from .views_export import UserExportCSVView, PurchaseExportCSVView

urlpatterns = [
    path('', views.UserListView.as_view(), name='user-list'),
    path('instructors/', views.InstructorCreateView.as_view(), name='instructor-create'),
    path('students/', views.StudentCreateView.as_view(), name='student-create'),
    path('export/csv/', UserExportCSVView.as_view(), name='user-export-csv'),
    path('purchases/export/csv/', PurchaseExportCSVView.as_view(), name='purchase-export-csv'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/change-password/', views.AdminChangePasswordView.as_view(), name='user-change-password'),
    path('<int:pk>/unlock/', views.AdminUnlockAccountView.as_view(), name='user-unlock'),
]
