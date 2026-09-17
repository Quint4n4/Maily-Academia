"""
Selectores de la app de progreso: la puerta unica por la que se leen sus
registros.

`django-backend` no deja margen:

    Toda lectura por id vive en un selector. Un Model.objects.get(id=...) en la
    vista es la forma canonica de saltarse el filtro de ambito.

Este archivo nace con los cupones. El resto de la app todavia lee desde la
vista (`views.py`, `views_payments.py`); se ira moviendo aqui conforme se
toque cada endpoint, no de golpe.
"""
from django.db.models import Max, Q, QuerySet
from django.http import Http404

from .models import Coupon, Purchase


def cupones_para_admin() -> QuerySet[Coupon]:
    """
    Listado base de cupones para el panel de administracion.

    El `prefetch_related` no es cosmetico: `applicable_courses` es M2M y el
    serializer la expone como lista de ids. Sin el, un listado de 20 cupones
    dispara 21 consultas. Con el, 2. Hay un test que cuenta las consultas para
    que un N+1 futuro rompa la suite y no la pantalla.

    El desempate por `-id` esta porque `created_at` es `auto_now_add` y dos
    cupones creados en la misma peticion pueden empatar; sin desempate, la
    paginacion puede repetir o saltarse una fila entre paginas.

    `last_used_at` se DERIVA aqui, no es una columna. Decidido por Emanuel el
    2026-09-17: la pantalla lo pide
    (`cursos-maily/src/pages/admin/CouponManagement.jsx:158`) y anadirlo al
    modelo seria una migracion. Se calcula como la fecha de la ultima compra
    **completada** que uso el cupon.

    Es un `Max` con `filter`, o sea un JOIN agregado dentro de la MISMA
    consulta: no anade una query por cupon. Hacerlo en un
    `SerializerMethodField` que consulte por fila seria el N+1 que el test de
    conteo existe para impedir.

    Se usa `paid_at` porque es la fecha canonica de venta en el resto del
    backend (`views_admin_analytics.py:106`, `views.py:34`). Una compra
    completada sin `paid_at` --no la produce el flujo de cobro, que escribe esa
    fecha en `views_payments.py:272`-- quedaria fuera del maximo.

    Cuenta COMPLETED y REFUNDED, y deja fuera PENDING y FAILED. La razon es que
    mida lo MISMO que `times_used`: el contador sube cuando el cobro entra y no
    baja al reembolsar, asi que un reembolso sigue siendo un uso gastado. Si un
    dia se decide que reembolsar devuelve el uso, hay que cambiar las dos cosas
    a la vez o la pantalla volvera a mostrar dos numeros que no cuadran.

    AMBITO>> `Coupon` NO tiene campo de academia y este endpoint es solo-admin,
    que ve las tres. El ambito de un cupon solo seria derivable por
    `applicable_courses`, y eso es una decision de diseno pendiente
    --documentada en `.claude/PERFIL-DEL-REPO.md` seccion 2--, no algo que
    resuelva este selector por su cuenta.
    """
    return (
        Coupon.objects
        .prefetch_related('applicable_courses')
        .annotate(
            last_used_at=Max(
                'purchases__paid_at',
                filter=Q(purchases__status__in=[
                    Purchase.Status.COMPLETED,
                    Purchase.Status.REFUNDED,
                ]),
            ),
        )
        .order_by('-created_at', '-id')
    )


def cupon_o_404(pk: int) -> Coupon:
    """Un cupon por id, o 404. Nunca `objects.get()` en la vista."""
    try:
        return cupones_para_admin().get(pk=pk)
    except Coupon.DoesNotExist:
        raise Http404('Cupón no encontrado.')
