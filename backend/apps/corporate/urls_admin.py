"""URLs de administración para el portal corporativo."""
from django.urls import path
from . import views_admin

urlpatterns = [
    # Beneficios
    path('benefits/', views_admin.AdminBenefitListCreateView.as_view(), name='admin-corporate-benefits'),
    path('benefits/<int:pk>/', views_admin.AdminBenefitDetailView.as_view(), name='admin-corporate-benefit-detail'),
    path('benefits/<int:benefit_id>/schedules/', views_admin.AdminScheduleListCreateView.as_view(), name='admin-corporate-schedules'),
    # Horarios
    path('schedules/<int:pk>/', views_admin.AdminScheduleDetailView.as_view(), name='admin-corporate-schedule-detail'),
    # Excepciones
    path('exceptions/', views_admin.AdminExceptionListCreateView.as_view(), name='admin-corporate-exceptions'),
    path('exceptions/<int:pk>/', views_admin.AdminExceptionDetailView.as_view(), name='admin-corporate-exception-detail'),
    # Reservaciones
    path('reservations/', views_admin.AdminReservationListView.as_view(), name='admin-corporate-reservations'),
    path('reservations/<int:pk>/', views_admin.AdminReservationDetailView.as_view(), name='admin-corporate-reservation-detail'),
    # Solicitudes
    path('requests/', views_admin.AdminRequestListView.as_view(), name='admin-corporate-requests'),
    path('requests/<int:pk>/', views_admin.AdminRequestDetailView.as_view(), name='admin-corporate-request-detail'),
    # Empleados
    path('employees/', views_admin.AdminEmployeeListView.as_view(), name='admin-corporate-employees'),
    # Estadísticas
    path('stats/', views_admin.AdminCorporateStatsView.as_view(), name='admin-corporate-stats'),
]
