from django.urls import path

from . import views

urlpatterns = [
    path('', views.MyCertificatesView.as_view(), name='certificate-list'),
    path('verify/<uuid:verification_code>/', views.CertificateVerifyView.as_view(), name='certificate-verify'),
    path('claim/<int:course_id>/', views.CertificateClaimView.as_view(), name='certificate-claim'),
    path('<int:pk>/download/', views.CertificateDownloadView.as_view(), name='certificate-download'),
]
