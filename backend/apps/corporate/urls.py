"""URLs para empleados del portal corporativo."""
from django.urls import path
from . import views

urlpatterns = [
    # Beneficios
    path('benefits/', views.BenefitTypeListView.as_view(), name='corporate-benefits-list'),
    path('benefits/<slug:slug>/availability/', views.BenefitAvailabilityView.as_view(), name='corporate-benefit-availability'),
    path('benefits/<slug:slug>/request/', views.BenefitRequestCreateView.as_view(), name='corporate-benefit-request'),
    # Solicitudes
    path('requests/', views.BenefitRequestListView.as_view(), name='corporate-requests-list'),
    # Reservaciones
    path('reservations/', views.ReservationListView.as_view(), name='corporate-reservations-list'),
    path('reservations/create/', views.ReservationCreateView.as_view(), name='corporate-reservations-create'),
    path('reservations/<int:pk>/', views.ReservationDetailView.as_view(), name='corporate-reservation-detail'),
    path('reservations/<int:pk>/cancel/', views.ReservationCancelView.as_view(), name='corporate-reservation-cancel'),
    # Notificaciones
    path('notifications/', views.NotificationListView.as_view(), name='corporate-notifications-list'),
    path('notifications/unread-count/', views.NotificationUnreadCountView.as_view(), name='corporate-notifications-count'),
    path('notifications/mark-read/', views.NotificationMarkReadView.as_view(), name='corporate-notifications-mark-read'),
    # Dashboard
    path('dashboard/', views.CorporateDashboardView.as_view(), name='corporate-dashboard'),
]
