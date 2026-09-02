"""CSV export views for admin panel."""
import csv

from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import IsAdmin
from apps.progress.models import Purchase


class UserExportCSVView(APIView):
    """GET /api/users/export/csv/ – export all users as CSV."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="usuarios.csv"'
        response.write('\ufeff')  # BOM for Excel

        writer = csv.writer(response)
        writer.writerow(['ID', 'Email', 'Nombre', 'Apellido', 'Rol', 'Activo', 'Fecha de registro'])

        role_filter = request.query_params.get('role', '')
        qs = User.objects.all().order_by('-date_joined')
        if role_filter:
            qs = qs.filter(role=role_filter)

        for u in qs.iterator():
            writer.writerow([
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.role,
                'Sí' if u.is_active else 'No',
                u.date_joined.strftime('%Y-%m-%d %H:%M') if u.date_joined else '',
            ])

        return response


class PurchaseExportCSVView(APIView):
    """GET /api/payments/export/csv/ – export all purchases as CSV."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="compras.csv"'
        response.write('\ufeff')

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Email usuario', 'Curso', 'Monto', 'Moneda', 'Estado',
            'Método de pago', 'Stripe PaymentIntent', 'Fecha',
        ])

        qs = Purchase.objects.select_related('user', 'course').order_by('-created_at')
        status_filter = request.query_params.get('status', '')
        if status_filter:
            qs = qs.filter(status=status_filter)

        for p in qs.iterator():
            writer.writerow([
                p.id,
                p.user.email,
                p.course.title,
                str(p.amount),
                p.currency,
                p.status,
                p.payment_method,
                p.stripe_payment_intent_id or '',
                p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else '',
            ])

        return response
