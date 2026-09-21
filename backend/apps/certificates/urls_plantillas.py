from django.urls import path

from . import views_plantillas as vistas

urlpatterns = [
    path('plantillas/', vistas.PlantillasView.as_view(), name='plantilla-list'),
    path('plantillas/<int:pk>/', vistas.PlantillaDetalleView.as_view(), name='plantilla-detail'),
    path('plantillas/<int:pk>/preview/', vistas.PlantillaPreviewView.as_view(), name='plantilla-preview'),
    path('recursos/', vistas.RecursosView.as_view(), name='recurso-list'),
    path('recursos/<int:pk>/', vistas.RecursoDetalleView.as_view(), name='recurso-detail'),
]
