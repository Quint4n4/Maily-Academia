from django.urls import path

from . import views_payments

urlpatterns = [
    # Configuración y creación de intento de pago
    path('config/', views_payments.StripeConfigView.as_view(), name='stripe-config'),
    path('create-intent/', views_payments.CreatePaymentIntentView.as_view(), name='create-payment-intent'),

    # Historial de compras del alumno
    path('history/', views_payments.PaymentHistoryView.as_view(), name='payment-history'),

    # Validación de cupones
    path('coupons/validate/', views_payments.ValidateCouponView.as_view(), name='coupon-validate'),

    # Acciones por compra específica
    path('<int:purchase_id>/status/', views_payments.PaymentStatusView.as_view(), name='payment-status'),
    path('<int:purchase_id>/refund/', views_payments.AdminRefundView.as_view(), name='admin-refund'),
    path('<int:purchase_id>/invoice/', views_payments.GenerateInvoiceView.as_view(), name='generate-invoice'),

    # Webhook de Stripe
    path('webhook/', views_payments.StripeWebhookView.as_view(), name='stripe-webhook'),
]
