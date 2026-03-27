"""
Vistas de pago con Stripe: PaymentIntent, webhook, status, refund, cupones, facturas.
"""
import logging
import threading
from io import BytesIO

import stripe
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import F
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course
from apps.users.permissions import IsAdmin

from .models import Coupon, Enrollment, Invoice, Purchase, StripeWebhookEvent
from .serializers import EnrollmentSerializer, PurchaseStudentSerializer
from .activity_logger import log_activity

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


def _get_or_create_stripe_customer(user):
    """Obtiene o crea un Stripe Customer para el usuario."""
    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer = stripe.Customer.create(
        email=user.email,
        name=user.get_full_name() or user.username,
        metadata={'user_id': str(user.id)},
    )
    user.stripe_customer_id = customer.id
    user.save(update_fields=['stripe_customer_id'])
    return customer.id


class CreatePaymentIntentView(APIView):
    """POST /api/payments/create-intent/ — Crea un PaymentIntent de Stripe."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('course_id')
        coupon_code = request.data.get('coupon_code', '').strip().upper()

        if not course_id:
            return Response(
                {'detail': 'course_id es requerido.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {'detail': 'Curso no encontrado.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if not course.price or course.price <= 0:
            return Response(
                {'detail': 'Este curso es gratuito. Usa la opción de inscripción.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        # Verificar si ya está inscrito
        if Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'detail': 'Ya estás inscrito en este curso.'},
                status=http_status.HTTP_200_OK,
            )

        # Resolver cupón si se envió
        coupon = None
        final_price = course.price
        discount_amount_val = None

        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code)
            except Coupon.DoesNotExist:
                return Response(
                    {'detail': 'Cupón no encontrado.'},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

            valid, reason = coupon.is_valid(course=course)
            if not valid:
                return Response(
                    {'detail': reason},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

            final_price, discount_amount_val = coupon.calculate_discount(course.price)

        # Verificar si ya hay un purchase pendiente y reutilizar (solo si no viene cupón nuevo)
        if not coupon_code:
            existing = Purchase.objects.filter(
                user=request.user, course=course, status=Purchase.Status.PENDING,
            ).first()

            if existing and existing.stripe_payment_intent_id:
                try:
                    intent = stripe.PaymentIntent.retrieve(existing.stripe_payment_intent_id)
                    if intent.status in ('requires_payment_method', 'requires_confirmation', 'requires_action'):
                        return Response({
                            'client_secret': intent.client_secret,
                            'purchase_id': existing.id,
                            'amount': str(existing.amount),
                            'currency': existing.currency,
                        })
                except stripe.error.StripeError:
                    # Intent inválido, crear uno nuevo
                    pass

        currency = settings.STRIPE_CURRENCY
        amount_cents = int(final_price * 100)
        customer_id = _get_or_create_stripe_customer(request.user)

        stripe_metadata = {
            'course_id': str(course.id),
            'user_id': str(request.user.id),
        }
        if coupon:
            stripe_metadata['coupon_code'] = coupon.code

        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                customer=customer_id,
                metadata=stripe_metadata,
                # Idempotency: incluye cupón para permitir reintentos con descuento
                idempotency_key=f'pi_{request.user.id}_{course.id}_{coupon_code or "none"}',
            )
        except stripe.error.StripeError as e:
            logger.error('Stripe PaymentIntent creation failed: %s', e)
            return Response(
                {'detail': 'Error al iniciar el pago. Intenta de nuevo.'},
                status=http_status.HTTP_502_BAD_GATEWAY,
            )

        # Construir defaults del purchase
        purchase_defaults = {
            'amount': final_price,
            'currency': currency,
            'status': Purchase.Status.PENDING,
            'stripe_payment_intent_id': intent.id,
            'payment_method': 'stripe',
            'coupon': coupon,
        }
        if coupon:
            purchase_defaults['original_amount'] = course.price
            purchase_defaults['discount_amount'] = discount_amount_val

        # Crear o actualizar Purchase
        purchase, _ = Purchase.objects.update_or_create(
            user=request.user,
            course=course,
            defaults=purchase_defaults,
        )

        # Incrementar uso del cupón de forma atómica
        if coupon:
            Coupon.objects.filter(pk=coupon.pk).update(current_uses=F('current_uses') + 1)

        response_data = {
            'client_secret': intent.client_secret,
            'purchase_id': purchase.id,
            'amount': str(purchase.amount),
            'currency': purchase.currency,
        }
        if coupon:
            response_data['coupon_applied'] = {
                'code': coupon.code,
                'original_price': str(course.price),
                'discount_amount': str(discount_amount_val),
                'final_price': str(final_price),
            }

        return Response(response_data)


class PaymentStatusView(APIView):
    """GET /api/payments/<purchase_id>/status/ — Estado del pago."""

    permission_classes = [IsAuthenticated]

    def get(self, request, purchase_id):
        try:
            purchase = Purchase.objects.select_related('course').get(
                pk=purchase_id, user=request.user,
            )
        except Purchase.DoesNotExist:
            return Response(
                {'detail': 'Compra no encontrada.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )
        return Response(PurchaseStudentSerializer(purchase).data)


class StripeWebhookView(APIView):
    """POST /api/payments/webhook/ — Recibe webhooks de Stripe (CSRF exempt)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        if not webhook_secret:
            logger.error('STRIPE_WEBHOOK_SECRET not configured')
            return HttpResponse(status=500)

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.warning('Stripe webhook signature verification failed: %s', e)
            return HttpResponse(status=400)

        # Idempotencia: no procesar evento duplicado
        if StripeWebhookEvent.objects.filter(stripe_event_id=event.id).exists():
            return HttpResponse(status=200)

        StripeWebhookEvent.objects.create(
            stripe_event_id=event.id,
            event_type=event.type,
            payload=event.data.object if hasattr(event.data, 'object') else {},
        )

        if event.type == 'payment_intent.succeeded':
            self._handle_payment_succeeded(event.data.object)
        elif event.type == 'payment_intent.payment_failed':
            self._handle_payment_failed(event.data.object)
        elif event.type == 'charge.refunded':
            self._handle_charge_refunded(event.data.object)

        # Marcar como procesado
        StripeWebhookEvent.objects.filter(stripe_event_id=event.id).update(processed=True)
        return HttpResponse(status=200)

    @staticmethod
    def _handle_payment_succeeded(payment_intent):
        pi_id = payment_intent.get('id') if isinstance(payment_intent, dict) else payment_intent.id
        try:
            purchase = Purchase.objects.select_related('user', 'course').get(
                stripe_payment_intent_id=pi_id,
            )
        except Purchase.DoesNotExist:
            logger.warning('Purchase not found for PaymentIntent %s', pi_id)
            return

        if purchase.status == Purchase.Status.COMPLETED:
            return  # Ya procesado

        charges = payment_intent.get('charges', {}) if isinstance(payment_intent, dict) else {}
        charge_data = (charges.get('data') or [{}])[0] if charges else {}

        purchase.status = Purchase.Status.COMPLETED
        purchase.completed_at = timezone.now()
        purchase.paid_at = timezone.now()
        purchase.stripe_charge_id = charge_data.get('id', '')
        purchase.receipt_url = charge_data.get('receipt_url', '')
        purchase.save()

        # Crear enrollment automáticamente
        enrollment, _ = Enrollment.objects.get_or_create(
            user=purchase.user,
            course=purchase.course,
        )
        log_activity(
            purchase.user,
            'course_enrolled',
            'course',
            purchase.course.id,
            {'course_title': purchase.course.title, 'via': 'stripe_purchase'},
        )

    @staticmethod
    def _handle_payment_failed(payment_intent):
        pi_id = payment_intent.get('id') if isinstance(payment_intent, dict) else payment_intent.id
        try:
            purchase = Purchase.objects.get(stripe_payment_intent_id=pi_id)
        except Purchase.DoesNotExist:
            return
        purchase.status = Purchase.Status.FAILED
        purchase.save(update_fields=['status'])

    @staticmethod
    def _handle_charge_refunded(charge):
        charge_id = charge.get('id') if isinstance(charge, dict) else charge.id
        try:
            purchase = Purchase.objects.get(stripe_charge_id=charge_id)
        except Purchase.DoesNotExist:
            return

        amount_refunded = charge.get('amount_refunded', 0) if isinstance(charge, dict) else getattr(charge, 'amount_refunded', 0)
        amount_total = charge.get('amount', 0) if isinstance(charge, dict) else getattr(charge, 'amount', 0)

        purchase.refund_amount = amount_refunded / 100  # centavos a unidades
        if amount_refunded >= amount_total:
            purchase.refund_status = Purchase.RefundStatus.FULL
            purchase.status = Purchase.Status.REFUNDED
        else:
            purchase.refund_status = Purchase.RefundStatus.PARTIAL
        purchase.save()


class AdminRefundView(APIView):
    """POST /api/payments/<purchase_id>/refund/ — Reembolso con notificación por email (admin)."""

    permission_classes = [IsAdmin]

    def post(self, request, purchase_id):
        try:
            purchase = Purchase.objects.select_related('user', 'course').get(
                pk=purchase_id, status=Purchase.Status.COMPLETED,
            )
        except Purchase.DoesNotExist:
            return Response(
                {'detail': 'Compra completada no encontrada.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if not purchase.stripe_payment_intent_id:
            return Response(
                {'detail': 'Esta compra no tiene un PaymentIntent de Stripe asociado.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        amount = request.data.get('amount')  # en unidades (ej: 199.00), None = total
        reason = request.data.get('reason', '')

        try:
            refund_params = {
                'payment_intent': purchase.stripe_payment_intent_id,
            }
            if amount:
                refund_params['amount'] = int(float(amount) * 100)

            refund = stripe.Refund.create(**refund_params)
        except stripe.error.StripeError as e:
            logger.error('Stripe refund failed: %s', e)
            return Response(
                {'detail': f'Error al procesar reembolso: {str(e)}'},
                status=http_status.HTTP_502_BAD_GATEWAY,
            )

        purchase.refund_reason = reason
        # El webhook de charge.refunded actualizará los montos reales
        purchase.save(update_fields=['refund_reason'])

        # Calcular monto reembolsado para el email
        monto_reembolsado = float(amount) if amount else float(purchase.amount)

        # Enviar email de notificación al alumno en segundo plano
        _enviar_email_reembolso(
            email=purchase.user.email,
            nombre=purchase.user.get_full_name() or purchase.user.email,
            curso=purchase.course.title,
            monto=monto_reembolsado,
            moneda=purchase.currency.upper(),
            razon=reason,
        )

        return Response({
            'detail': 'Reembolso procesado.',
            'refund_id': refund.id,
            'status': refund.status,
        })


class StripeConfigView(APIView):
    """GET /api/payments/config/ — Retorna la publishable key para el frontend."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
        })


# ---------------------------------------------------------------------------
# Función auxiliar: email de reembolso
# ---------------------------------------------------------------------------

def _enviar_email_reembolso(email, nombre, curso, monto, moneda, razon):
    """Envía email de confirmación de reembolso al alumno en un hilo aparte."""

    asunto = f'Tu reembolso ha sido procesado — {curso}'
    razon_texto = f'\nRazón indicada: {razon}\n' if razon else ''
    cuerpo = (
        f'Hola {nombre},\n\n'
        f'Te confirmamos que hemos procesado un reembolso por ${monto:.2f} {moneda} '
        f'correspondiente al curso "{curso}".\n'
        f'{razon_texto}\n'
        f'El monto será acreditado en tu método de pago original en un plazo estimado de '
        f'5 a 10 días hábiles, dependiendo de tu banco o institución financiera.\n\n'
        f'Si tienes dudas, contáctanos respondiendo este correo.\n\n'
        f'El equipo de Maily Academia'
    )

    def _enviar():
        try:
            send_mail(
                subject=asunto,
                message=cuerpo,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as exc:
            logger.exception('Error enviando email de reembolso a %s: %s', email, exc)

    thread = threading.Thread(target=_enviar, daemon=True)
    thread.start()


# ---------------------------------------------------------------------------
# Función auxiliar: generar PDF de factura
# ---------------------------------------------------------------------------

def _generar_pdf_factura(purchase, invoice_number):
    """Genera un PDF de recibo usando ReportLab y retorna bytes."""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
    except ImportError:
        logger.error('ReportLab no está instalado. No se puede generar el PDF.')
        return None

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # --- Encabezado ---
    p.setFont('Helvetica-Bold', 18)
    p.drawString(50, height - 60, 'RECIBO DE COMPRA')

    p.setFont('Helvetica', 12)
    p.drawString(50, height - 90, 'Maily Academia')

    # --- Número de factura y fecha ---
    p.setFont('Helvetica', 12)
    p.drawString(50, height - 120, f'Factura: {invoice_number}')

    fecha_str = ''
    if purchase.completed_at:
        fecha_str = purchase.completed_at.strftime('%d/%m/%Y %H:%M')
    elif purchase.paid_at:
        fecha_str = purchase.paid_at.strftime('%d/%m/%Y %H:%M')
    p.drawString(50, height - 140, f'Fecha: {fecha_str}')

    # --- Datos del alumno y curso ---
    nombre_alumno = purchase.user.get_full_name() or purchase.user.email
    p.drawString(50, height - 180, f'Alumno: {nombre_alumno}')
    p.drawString(50, height - 200, f'Correo: {purchase.user.email}')
    p.drawString(50, height - 230, f'Curso: {purchase.course.title}')

    # --- Desglose de precios ---
    y_pos = height - 270
    if purchase.coupon and purchase.original_amount is not None:
        p.drawString(50, y_pos, f'Precio original: ${purchase.original_amount} MXN')
        y_pos -= 20
        descuento = purchase.discount_amount or 0
        p.drawString(50, y_pos, f'Descuento ({purchase.coupon.code}): -${descuento} MXN')
        y_pos -= 20

    p.setFont('Helvetica-Bold', 13)
    p.drawString(50, y_pos, f'Total pagado: ${purchase.amount} {purchase.currency.upper()}')

    # --- Pie de página ---
    p.setFont('Helvetica', 9)
    p.drawString(50, 40, 'Este documento es un comprobante de compra electrónico.')

    p.save()
    buffer.seek(0)
    return buffer.read()


# ---------------------------------------------------------------------------
# Nuevas vistas: Validar cupón, Historial de pagos, Generar factura
# ---------------------------------------------------------------------------

class ValidateCouponView(APIView):
    """POST /api/payments/coupons/validate/ — Valida un cupón y calcula el descuento."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip().upper()
        course_id = request.data.get('course_id')

        if not code:
            return Response(
                {'detail': 'El campo code es requerido.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'reason': 'Cupón no encontrado.'})

        # Obtener curso si se proporcionó
        course = None
        original_price = None
        if course_id:
            try:
                course = Course.objects.get(pk=course_id)
                original_price = course.price
            except Course.DoesNotExist:
                return Response(
                    {'detail': 'Curso no encontrado.'},
                    status=http_status.HTTP_404_NOT_FOUND,
                )

        valid, reason = coupon.is_valid(course=course)
        if not valid:
            return Response({'valid': False, 'reason': reason})

        response_data = {
            'valid': True,
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': str(coupon.discount_value),
            'description': coupon.description,
        }

        if original_price is not None:
            final_price, discount_amount = coupon.calculate_discount(original_price)
            response_data.update({
                'original_price': str(original_price),
                'discount_amount': str(discount_amount),
                'final_price': str(final_price),
            })

        return Response(response_data)


class PaymentHistoryView(APIView):
    """GET /api/payments/history/ — Historial de compras del alumno autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        purchases = (
            Purchase.objects
            .select_related('course', 'coupon')
            .prefetch_related('invoice')
            .filter(user=request.user)
            .order_by('-created_at')
        )
        serializer = PurchaseStudentSerializer(purchases, many=True)
        return Response({'results': serializer.data})


class GenerateInvoiceView(APIView):
    """POST /api/payments/<purchase_id>/invoice/ — Genera o retorna la factura PDF de una compra."""

    permission_classes = [IsAuthenticated]

    def post(self, request, purchase_id):
        # Verificar que la compra pertenece al usuario o es admin
        from apps.users.permissions import IsAdmin as _IsAdmin
        es_admin = _IsAdmin().has_permission(request, self)

        try:
            if es_admin:
                purchase = Purchase.objects.select_related('user', 'course', 'coupon').get(pk=purchase_id)
            else:
                purchase = Purchase.objects.select_related('user', 'course', 'coupon').get(
                    pk=purchase_id, user=request.user,
                )
        except Purchase.DoesNotExist:
            return Response(
                {'detail': 'Compra no encontrada.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if purchase.status != Purchase.Status.COMPLETED:
            return Response(
                {'detail': 'Solo se pueden generar facturas para compras completadas.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        # Si ya existe factura, retornar la existente como PDF
        try:
            invoice = purchase.invoice
            pdf_bytes = _generar_pdf_factura(purchase, invoice.invoice_number)
            if pdf_bytes:
                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = (
                    f'attachment; filename="factura-{invoice.invoice_number}.pdf"'
                )
                return response
            return Response({
                'invoice_number': invoice.invoice_number,
                'issued_at': invoice.issued_at,
            })
        except Invoice.DoesNotExist:
            pass

        # Generar nuevo número de factura y crear la factura
        invoice_number = Invoice.generate_number()
        invoice = Invoice.objects.create(
            purchase=purchase,
            invoice_number=invoice_number,
        )

        pdf_bytes = _generar_pdf_factura(purchase, invoice_number)
        if pdf_bytes:
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="factura-{invoice_number}.pdf"'
            )
            return response

        # Fallback si ReportLab no está disponible
        return Response({
            'invoice_number': invoice_number,
            'issued_at': invoice.issued_at,
        }, status=http_status.HTTP_201_CREATED)
