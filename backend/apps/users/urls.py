"""Auth-related URL patterns: /api/auth/..."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth-register'),
    path('login/', views.SecureLoginView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('me/', views.MeView.as_view(), name='auth-me'),
    path('survey/', views.SurveyView.as_view(), name='auth-survey'),

    # Password reset
    path('password-reset/request/', views.RequestPasswordResetView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', views.ConfirmPasswordResetView.as_view(), name='password-reset-confirm'),
]
