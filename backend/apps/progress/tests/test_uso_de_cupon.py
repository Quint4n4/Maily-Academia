"""
Cuando se gasta un uso de cupon.

El 2026-09-17 `current_uses` se incrementaba en `CreatePaymentIntentView`, o sea
al ABRIR el formulario de pago. Consecuencias que estos tests fijan para que no
vuelvan:

  - una tarjeta rechazada o un carrito abandonado gastaban un uso;
  - el endpoint se puede llamar varias veces para la misma compra --el
    `update_or_create` reutiliza la fila-- y cada llamada sumaba otro uso;
  - el contador nunca baja, asi que un cupon con `max_uses` podia agotarse sin
    una sola venta cobrada.

El uso se cuenta ahora donde se cobra de verdad: el webhook de Stripe que marca
la compra como COMPLETED y escribe `paid_at`.
"""
import pytest
from django.utils import timezone

from apps.progress import views_payments
from apps.progress.models import Coupon, Purchase
from apps.progress.views_payments import StripeWebhookView

pytestmark = pytest.mark.django_db

CREAR_INTENTO = '/api/payments/create-intent/'
PI_DE_PRUEBA = 'pi_prueba_123'


@pytest.fixture
def cupon(db):
    return Coupon.objects.create(
        code='COBRO50', description='Mitad de precio',
        discount_type=Coupon.DiscountType.PERCENTAGE, discount_value=50,
        max_uses=0, is_active=True,
    )


@pytest.fixture
def curso_de_pago(academia_con_vitrina, curso_factory):
    curso = curso_factory(academia_con_vitrina, 'Curso de pago')
    curso.price = 500
    curso.save(update_fields=['price'])
    return curso


@pytest.fixture
def _stripe_falso(monkeypatch):
    """Evita salir a la red. Solo sustituye el transporte, no la logica."""
    class IntentFalso:
        id = PI_DE_PRUEBA
        client_secret = 'secret_de_prueba'

    monkeypatch.setattr(
        views_payments.stripe.PaymentIntent, 'create',
        lambda **kwargs: IntentFalso(),
    )
    monkeypatch.setattr(
        views_payments, '_get_or_create_stripe_customer',
        lambda user: 'cus_de_prueba',
    )


def _compra_pendiente(alumno, curso, cupon):
    return Purchase.objects.create(
        user=alumno, course=curso, coupon=cupon, amount=250,
        status=Purchase.Status.PENDING,
        stripe_payment_intent_id=PI_DE_PRUEBA,
    )


def _evento_de_cobro():
    """La forma del `payment_intent` que manda Stripe, reducida a lo que se lee."""
    return {
        'id': PI_DE_PRUEBA,
        'charges': {'data': [{
            'id': 'ch_prueba_123',
            'receipt_url': 'https://stripe.example/recibo',
        }]},
    }


class TestCuandoSeGastaUnUso:
    def test_abrir_el_formulario_de_pago_no_gasta_un_uso(
        self, api, alumno, cupon, curso_de_pago, _stripe_falso
    ):
        api.force_authenticate(alumno)

        respuesta = api.post(
            CREAR_INTENTO,
            {'course_id': curso_de_pago.id, 'coupon_code': cupon.code},
            format='json',
        )

        assert respuesta.status_code == 200
        cupon.refresh_from_db()
        assert cupon.current_uses == 0, 'abrir el pago no es cobrarlo'

    def test_reintentar_el_pago_tres_veces_no_gasta_tres_usos(
        self, api, alumno, cupon, curso_de_pago, _stripe_falso
    ):
        # El caso real: el alumno vuelve al checkout porque le rechazaron la
        # tarjeta. Antes, cada vuelta sumaba un uso.
        api.force_authenticate(alumno)

        for _ in range(3):
            api.post(
                CREAR_INTENTO,
                {'course_id': curso_de_pago.id, 'coupon_code': cupon.code},
                format='json',
            )

        cupon.refresh_from_db()
        assert cupon.current_uses == 0
        assert Purchase.objects.filter(user=alumno, course=curso_de_pago).count() == 1

    def test_el_cobro_confirmado_gasta_exactamente_un_uso(
        self, alumno, cupon, curso_de_pago
    ):
        compra = _compra_pendiente(alumno, curso_de_pago, cupon)

        StripeWebhookView._handle_payment_succeeded(_evento_de_cobro())

        cupon.refresh_from_db()
        compra.refresh_from_db()
        assert cupon.current_uses == 1
        assert compra.status == Purchase.Status.COMPLETED
        assert compra.paid_at is not None

    def test_el_mismo_cobro_notificado_dos_veces_gasta_un_solo_uso(
        self, alumno, cupon, curso_de_pago
    ):
        # Stripe reintenta sus webhooks. Si el contador subiera en cada aviso,
        # un reintento gastaria un uso que nadie pago.
        _compra_pendiente(alumno, curso_de_pago, cupon)

        StripeWebhookView._handle_payment_succeeded(_evento_de_cobro())
        StripeWebhookView._handle_payment_succeeded(_evento_de_cobro())

        cupon.refresh_from_db()
        assert cupon.current_uses == 1

    def test_una_compra_sin_cupon_no_toca_ningun_contador(
        self, alumno, cupon, curso_de_pago
    ):
        Purchase.objects.create(
            user=alumno, course=curso_de_pago, coupon=None, amount=500,
            status=Purchase.Status.PENDING, stripe_payment_intent_id=PI_DE_PRUEBA,
        )

        StripeWebhookView._handle_payment_succeeded(_evento_de_cobro())

        cupon.refresh_from_db()
        assert cupon.current_uses == 0


class TestCoherenciaConLaPantalla:
    """`times_used` y `last_used_at` tienen que contar lo mismo.

    Si midieran cosas distintas, el panel mostraria dos numeros que no cuadran y
    nadie sabria cual creer.
    """

    def test_una_venta_reembolsada_sigue_contando_como_uso(
        self, api, alumno, cupon, curso_de_pago
    ):
        from apps.users.models import User
        administrador = User.objects.create_user(
            email='admin-uso@ejemplo.com', username='admin-uso',
            password='Admin12345!', role='admin',
        )
        Purchase.objects.create(
            user=alumno, course=curso_de_pago, coupon=cupon, amount=250,
            status=Purchase.Status.REFUNDED, paid_at=timezone.now(),
        )
        api.force_authenticate(administrador)

        fila = api.get('/api/admin/coupons/').json()['results'][0]

        # El contador no baja al reembolsar, asi que la fecha tampoco puede
        # desaparecer: las dos columnas cuentan "ventas que llegaron a cobrarse".
        assert fila['last_used_at'] is not None
