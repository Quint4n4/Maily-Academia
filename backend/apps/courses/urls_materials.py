"""URLs para materiales por ID: /api/materials/{id}/ y download."""
from django.urls import path

from . import views

urlpatterns = [
    path('<int:pk>/', views.MaterialDetailView.as_view(), name='material-detail'),
    path('<int:pk>/download/', views.MaterialDownloadView.as_view(), name='material-download'),
]
