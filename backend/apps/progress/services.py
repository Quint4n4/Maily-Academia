"""
Servicios de la app de progreso: aqui viven las reglas de negocio que escriben.

`django-backend`:

    La vista no decide. Si tiene un `if` sobre una regla del negocio, ese `if`
    va en services.py.

Los tres servicios de cupones de abajo son los primeros de esta app. La razon
de que existan y no esten en la vista no es estetica: la misma regla tiene que
valer para el panel, para un comando de consola y para cualquier cosa futura
que cree cupones, y en la vista solo vale para la vista.
"""
from decimal import Decimal
from typing import Any, Iterable, Optional

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.users.models import User

from .models import Coupon

# Campos que la API nunca fija, aunque lleguen en el cuerpo de la peticion.
#
#   - id / created_at : identidad y auditoria.
#   - created_by      : sale de `request.user`, jamas del cuerpo. Si viniera de
#                       ahi, un admin podria atribuirle el cupon a otro.
#   - current_uses    : lo mueve el cobro, con un F() atomico
#                       (`apps/progress/views_payments.py:174`). Si el panel
#                       pudiera bajarlo a mano, un cupon agotado se "recarga"
#                       sin que quede rastro de cuantas veces se uso de verdad,
#                       y el limite de `max_uses` deja de significar nada.
_CAMPOS_QUE_LA_API_NO_FIJA: frozenset[str] = frozenset({
    'id', 'created_at', 'created_by', 'current_uses',
})


def _sin_campos_prohibidos(datos: dict[str, Any]) -> dict[str, Any]:
    """Corta los campos de identidad y de conteo antes de tocar el modelo.

    Los serializers de escritura ya no los declaran, asi que hoy esto no se
    dispara desde HTTP. Esta igual porque el dia que alguien agregue un campo a
    `fields` sin pensarlo, el corte sigue puesto aqui abajo.
    """
    intrusos = _CAMPOS_QUE_LA_API_NO_FIJA & set(datos)
    if intrusos:
        raise ValidationError(
            {campo: ['Este campo no se puede fijar desde la API.'] for campo in sorted(intrusos)}
        )
    return dict(datos)


def _validar_reglas(
    *,
    tipo: str,
    valor: Optional[Decimal],
    valido_desde: Optional[Any],
    valido_hasta: Optional[Any],
    revisar_valor: bool,
    revisar_fechas: bool,
) -> None:
    """Reglas de negocio del cupon. Los errores salen por clave de campo.

    La forma `{"campo": "mensaje"}` no es capricho: el modal del panel hace
    `Object.entries(data)` y pinta cada mensaje debajo de su input
    (`cursos-maily/src/pages/admin/CouponFormModal.jsx:105-112`). Un `detail`
    global se perderia en la pantalla.

    `revisar_valor` y `revisar_fechas` existen por el PATCH parcial: activar o
    desactivar un cupon manda solo `is_active`, y no debe fallar por un dato
    viejo que no se esta tocando. Se valida la transicion, no el estado entero.
    """
    # Los mensajes van en lista, que es la forma en que DRF devuelve los
    # errores de campo de un serializer. Si el service usara texto pelado, el
    # mismo 400 tendria dos formas segun quien lo levantara.
    errores: dict[str, list[str]] = {}

    if revisar_valor and valor is not None:
        if valor <= 0:
            errores['discount_value'] = ['El valor del descuento debe ser mayor a 0.']
        elif tipo == Coupon.DiscountType.PERCENTAGE and valor > 100:
            errores['discount_value'] = ['Un descuento por porcentaje no puede exceder 100.']

    if revisar_fechas and valido_desde and valido_hasta and valido_hasta <= valido_desde:
        errores['valid_until'] = ['La fecha de vencimiento debe ser posterior a la de inicio.']

    if errores:
        raise ValidationError(errores)


@transaction.atomic
def cupon_crear(*, datos: dict[str, Any], actor: User) -> Coupon:
    """Da de alta un cupon y lo atribuye a quien hizo la peticion.

    Escribe en dos tablas --el cupon y la intermedia de `applicable_courses`--
    asi que va dentro de una transaccion: un cupon guardado al que le faltan
    sus cursos aplica a TODOS los cursos (`Coupon.is_valid` trata la lista
    vacia como "sin restriccion"), que es justo lo contrario de lo que se pidio.
    """
    datos = _sin_campos_prohibidos(datos)
    cursos: Iterable = datos.pop('applicable_courses', [])

    # El modelo tiene `default=timezone.now`, pero si no se fija aqui el valor
    # validado y el guardado serian dos instantes distintos, y un `valid_until`
    # en el pasado se colaria.
    datos.setdefault('valid_from', timezone.now())

    _validar_reglas(
        tipo=datos.get('discount_type', Coupon.DiscountType.PERCENTAGE),
        valor=datos.get('discount_value'),
        valido_desde=datos.get('valid_from'),
        valido_hasta=datos.get('valid_until'),
        revisar_valor=True,
        revisar_fechas=True,
    )

    cupon = Coupon.objects.create(created_by=actor, **datos)
    cupon.applicable_courses.set(cursos)
    return cupon


@transaction.atomic
def cupon_actualizar(*, cupon: Coupon, datos: dict[str, Any]) -> Coupon:
    """Edita un cupon existente. Tambien es la via del activar/desactivar.

    El `update_fields` es la parte que importa y la que se ve inofensiva: un
    `cupon.save()` pelado reescribe TODAS las columnas con lo que hubiera en
    memoria, `current_uses` incluido. Si entre el GET del panel y este PATCH
    alguien canjea el cupon, ese canje se pierde en silencio y el cupon vuelve
    a tener usos disponibles. Limitando el save a los campos que de verdad
    cambian, el PATCH no puede pisar el contador.
    """
    datos = _sin_campos_prohibidos(datos)
    cursos: Optional[Iterable] = datos.pop('applicable_courses', None)

    _validar_reglas(
        tipo=datos.get('discount_type', cupon.discount_type),
        valor=datos.get('discount_value', cupon.discount_value),
        valido_desde=datos.get('valid_from', cupon.valid_from),
        valido_hasta=datos.get('valid_until', cupon.valid_until),
        revisar_valor='discount_value' in datos or 'discount_type' in datos,
        revisar_fechas='valid_from' in datos or 'valid_until' in datos,
    )

    if datos:
        for campo, valor in datos.items():
            setattr(cupon, campo, valor)
        cupon.save(update_fields=list(datos))

    if cursos is not None:
        cupon.applicable_courses.set(cursos)

    cupon.refresh_from_db()
    return cupon


@transaction.atomic
def cupon_eliminar(*, cupon: Coupon) -> None:
    """Baja de un cupon.

    Borrado fisico, que es lo que declara `backend.borrado: fisico` en el
    perfil del repo.

    Las compras que lo usaron NO se borran: `Purchase.coupon` es
    `on_delete=SET_NULL` (`apps/progress/models.py:47-54`), y `original_amount`
    y `discount_amount` quedan intactos en la compra. Lo que si se pierde para
    siempre es el CODIGO del cupon en esas compras historicas: el recibo PDF lo
    lee de `purchase.coupon.code` (`views_payments.py:474-478`) y a partir del
    borrado deja de imprimirlo. Esta anotado en el informe de entrega; cerrarlo
    pide congelar el codigo en `Purchase`, y eso es una migracion.
    """
    cupon.delete()
