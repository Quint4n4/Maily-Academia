"""
CRUD de cupones del panel de administracion.

El 2026-09-17 la pantalla de Cupones del panel llevaba 892 lineas escritas en el
frontend llamando a `/api/admin/coupons/`, que devolvia 404: los endpoints nunca
se escribieron. Estos tests fijan lo que ahora si existe.

Lo que cuidan, en orden de lo que costaria caro:

  1. Quien NO es admin no entra por ninguno de los cuatro metodos.
  2. `created_by` sale de la sesion, jamas del cuerpo.
  3. `current_uses` --las veces que el cupon se canjeo-- no se toca desde la
     API, ni escribiendolo ni pisandolo sin querer al editar otra cosa.
  4. El listado no tiene N+1.

Ver `.claude/PERFIL-DEL-REPO.md` y el informe de entrega del modulo.
"""
import pytest
from django.db.models import F
from django.utils import timezone
from datetime import timedelta

from apps.progress.models import Coupon, Purchase
from apps.progress.services import cupon_actualizar
from apps.users.models import User

pytestmark = pytest.mark.django_db

LISTA = '/api/admin/coupons/'


def detalle(cupon_id: int) -> str:
    return f'/api/admin/coupons/{cupon_id}/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def administrador(db):
    return User.objects.create_user(
        email='admin-cupones@ejemplo.com', username='admin-cupones',
        password='Admin12345!', role='admin',
    )


@pytest.fixture
def cupon_factory(db):
    def crear(code='VERANO20', **extra):
        datos = dict(
            description='Descuento de verano',
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=20,
            max_uses=0,
            is_active=True,
        )
        datos.update(extra)
        return Coupon.objects.create(code=code, **datos)
    return crear


@pytest.fixture
def payload_valido():
    """El payload exacto que arma el modal del panel.

    Copiado de `cursos-maily/src/pages/admin/CouponFormModal.jsx:97-108`. Si el
    modal cambia de forma, este test es el que debe fallar primero.
    """
    return {
        'code': 'BIENVENIDA10',
        'description': 'Descuento de bienvenida',
        'discount_type': 'percentage',
        'discount_value': 10,
        'max_uses': 100,
        'valid_from': timezone.now().isoformat(),
        'valid_until': (timezone.now() + timedelta(days=30)).isoformat(),
        'applicable_courses': [],
        'is_active': True,
    }


# ---------------------------------------------------------------------------
# 1 · Quien puede entrar
# ---------------------------------------------------------------------------
class TestPermisos:
    def test_el_anonimo_recibe_401_en_los_cuatro_metodos(self, api, cupon_factory):
        cupon = cupon_factory()

        assert api.get(LISTA).status_code == 401
        assert api.post(LISTA, {'code': 'X'}, format='json').status_code == 401
        assert api.patch(detalle(cupon.id), {'is_active': False}, format='json').status_code == 401
        assert api.delete(detalle(cupon.id)).status_code == 401

    @pytest.mark.parametrize('rol', ['alumno', 'instructor'])
    def test_quien_no_es_admin_recibe_403_en_los_cuatro_metodos(
        self, api, request, rol, cupon_factory
    ):
        # Un instructor administra SUS cursos, no los descuentos de la
        # plataforma: el precio final de una venta no es suyo.
        usuario = request.getfixturevalue(rol)
        cupon = cupon_factory()
        api.force_authenticate(usuario)

        assert api.get(LISTA).status_code == 403
        assert api.post(LISTA, {'code': 'X'}, format='json').status_code == 403
        assert api.patch(detalle(cupon.id), {'is_active': False}, format='json').status_code == 403
        assert api.delete(detalle(cupon.id)).status_code == 403

    def test_un_no_admin_no_alcanza_a_borrar_el_cupon(self, api, alumno, cupon_factory):
        # El 403 no basta como prueba: lo que importa es que la fila siga ahi.
        cupon = cupon_factory()
        api.force_authenticate(alumno)

        api.delete(detalle(cupon.id))

        assert Coupon.objects.filter(pk=cupon.pk).exists()

    def test_el_admin_entra(self, api, administrador):
        api.force_authenticate(administrador)
        assert api.get(LISTA).status_code == 200


# ---------------------------------------------------------------------------
# 2 · Alta
# ---------------------------------------------------------------------------
class TestAlta:
    def test_el_alta_guarda_el_cupon_con_su_codigo(self, api, administrador, payload_valido):
        api.force_authenticate(administrador)

        respuesta = api.post(LISTA, payload_valido, format='json')

        assert respuesta.status_code == 201
        cupon = Coupon.objects.get(code='BIENVENIDA10')
        assert cupon.discount_type == 'percentage'
        assert cupon.discount_value == 10
        assert cupon.max_uses == 100
        assert respuesta.json()['code'] == 'BIENVENIDA10'

    def test_el_codigo_duplicado_se_rechaza(self, api, administrador, payload_valido, cupon_factory):
        cupon_factory(code='BIENVENIDA10')
        api.force_authenticate(administrador)

        respuesta = api.post(LISTA, payload_valido, format='json')

        assert respuesta.status_code == 400
        # El error va en la clave del campo: el modal lo pinta debajo del input.
        assert 'code' in respuesta.json()
        assert Coupon.objects.filter(code='BIENVENIDA10').count() == 1

    def test_todos_los_errores_de_validacion_tienen_la_misma_forma(
        self, api, administrador, payload_valido, cupon_factory
    ):
        # Uno lo levanta el serializer y otro el service. Si salieran con formas
        # distintas --lista contra texto pelado--, el modal necesitaria un caso
        # especial permanente para adivinar cual le toco.
        cupon_factory(code='BIENVENIDA10')
        api.force_authenticate(administrador)

        del_serializer = api.post(LISTA, payload_valido, format='json').json()
        del_service = api.post(
            LISTA, {**payload_valido, 'code': 'OTRO', 'discount_value': 150}, format='json',
        ).json()

        assert isinstance(del_serializer['code'], list)
        assert isinstance(del_service['discount_value'], list)

    def test_el_codigo_duplicado_tampoco_pasa_cambiando_mayusculas(
        self, api, administrador, payload_valido, cupon_factory
    ):
        # Al canjear se busca con coincidencia exacta sobre el codigo en
        # mayusculas (`views_payments.py:89`). Dos cupones que solo difieren en
        # mayusculas serian uno canjeable y otro invisible.
        cupon_factory(code='BIENVENIDA10')
        api.force_authenticate(administrador)

        respuesta = api.post(LISTA, {**payload_valido, 'code': 'bienvenida10'}, format='json')

        assert respuesta.status_code == 400
        assert 'code' in respuesta.json()

    def test_el_codigo_se_guarda_en_mayusculas_aunque_llegue_en_minusculas(
        self, api, administrador, payload_valido
    ):
        api.force_authenticate(administrador)

        api.post(LISTA, {**payload_valido, 'code': 'verano-25'}, format='json')

        assert Coupon.objects.filter(code='VERANO-25').exists()

    def test_un_porcentaje_mayor_a_cien_se_rechaza(self, api, administrador, payload_valido):
        api.force_authenticate(administrador)

        respuesta = api.post(
            LISTA, {**payload_valido, 'discount_type': 'percentage', 'discount_value': 150},
            format='json',
        )

        assert respuesta.status_code == 400
        assert 'discount_value' in respuesta.json()
        assert not Coupon.objects.filter(code='BIENVENIDA10').exists()

    def test_un_vencimiento_anterior_al_inicio_se_rechaza(self, api, administrador, payload_valido):
        ahora = timezone.now()
        api.force_authenticate(administrador)

        respuesta = api.post(
            LISTA,
            {
                **payload_valido,
                'valid_from': ahora.isoformat(),
                'valid_until': (ahora - timedelta(days=1)).isoformat(),
            },
            format='json',
        )

        assert respuesta.status_code == 400
        assert 'valid_until' in respuesta.json()

    def test_un_cupon_sin_vencimiento_es_valido(self, api, administrador, payload_valido):
        # "Sin expiración" es un estado que la pantalla muestra a proposito
        # (`CouponManagement.jsx:80`), no un campo olvidado.
        api.force_authenticate(administrador)

        respuesta = api.post(LISTA, {**payload_valido, 'valid_until': None}, format='json')

        assert respuesta.status_code == 201
        assert Coupon.objects.get(code='BIENVENIDA10').valid_until is None

    def test_el_alta_asocia_los_cursos_que_le_pasan(
        self, api, administrador, payload_valido, academia_con_vitrina, curso_factory
    ):
        curso = curso_factory(academia_con_vitrina, 'Nutricion clinica')
        api.force_authenticate(administrador)

        respuesta = api.post(
            LISTA, {**payload_valido, 'applicable_courses': [curso.id]}, format='json',
        )

        assert respuesta.status_code == 201
        cupon = Coupon.objects.get(code='BIENVENIDA10')
        assert list(cupon.applicable_courses.values_list('id', flat=True)) == [curso.id]
        assert respuesta.json()['applicable_courses'] == [curso.id]


# ---------------------------------------------------------------------------
# 3 · created_by: sale de la sesion, no del cuerpo
# ---------------------------------------------------------------------------
class TestAtribucion:
    def test_el_cupon_queda_atribuido_a_quien_hizo_la_peticion(
        self, api, administrador, payload_valido
    ):
        api.force_authenticate(administrador)

        api.post(LISTA, payload_valido, format='json')

        assert Coupon.objects.get(code='BIENVENIDA10').created_by == administrador

    def test_no_se_puede_atribuir_el_cupon_a_otro_usuario_desde_el_cuerpo(
        self, api, administrador, alumno, payload_valido
    ):
        api.force_authenticate(administrador)

        respuesta = api.post(
            LISTA, {**payload_valido, 'created_by': alumno.id}, format='json',
        )

        assert respuesta.status_code == 201
        cupon = Coupon.objects.get(code='BIENVENIDA10')
        assert cupon.created_by == administrador, 'created_by se dejo fijar desde el cuerpo'


# ---------------------------------------------------------------------------
# 4 · current_uses: el contador de canjes no se toca desde la API
# ---------------------------------------------------------------------------
class TestContadorDeUsos:
    def test_el_alta_no_puede_arrancar_con_usos_ya_consumidos(
        self, api, administrador, payload_valido
    ):
        api.force_authenticate(administrador)

        api.post(LISTA, {**payload_valido, 'current_uses': 99}, format='json')

        assert Coupon.objects.get(code='BIENVENIDA10').current_uses == 0

    @pytest.mark.parametrize('campo', ['current_uses', 'times_used'])
    def test_la_edicion_no_puede_reescribir_el_contador(
        self, api, administrador, cupon_factory, campo
    ):
        # Recargar un cupon agotado sin dejar rastro convierte `max_uses` en
        # adorno: la promocion de 100 usos se vuelve infinita y el descuento se
        # sigue aplicando sobre ventas reales.
        cupon = cupon_factory()
        Coupon.objects.filter(pk=cupon.pk).update(current_uses=7)
        api.force_authenticate(administrador)

        respuesta = api.patch(detalle(cupon.id), {campo: 0}, format='json')

        assert respuesta.status_code == 200
        cupon.refresh_from_db()
        assert cupon.current_uses == 7

    def test_editar_un_cupon_no_pisa_un_canje_ocurrido_mientras_tanto(self, cupon_factory):
        # El panel lee el cupon, el admin tarda en el formulario, alguien canjea
        # en ese rato, el admin guarda. Un `save()` pelado reescribe todas las
        # columnas con lo que se leyo y el canje desaparece.
        cupon = cupon_factory()
        leido_por_el_panel = Coupon.objects.get(pk=cupon.pk)

        Coupon.objects.filter(pk=cupon.pk).update(current_uses=F('current_uses') + 1)
        cupon_actualizar(cupon=leido_por_el_panel, datos={'is_active': False})

        cupon.refresh_from_db()
        assert cupon.current_uses == 1, 'la edicion se comio un canje'
        assert cupon.is_active is False


# ---------------------------------------------------------------------------
# 5 · Edicion y activar/desactivar
# ---------------------------------------------------------------------------
class TestEdicion:
    def test_la_edicion_cambia_lo_que_se_le_manda_y_nada_mas(
        self, api, administrador, cupon_factory
    ):
        cupon = cupon_factory(description='Descuento de verano')
        api.force_authenticate(administrador)

        respuesta = api.patch(
            detalle(cupon.id), {'description': 'Descuento de invierno'}, format='json',
        )

        assert respuesta.status_code == 200
        cupon.refresh_from_db()
        assert cupon.description == 'Descuento de invierno'
        assert cupon.code == 'VERANO20'
        assert cupon.discount_value == 20

    def test_desactivar_un_cupon_mandando_solo_is_active(self, api, administrador, cupon_factory):
        # Es como la pantalla implementa el interruptor
        # (`adminService.js` -> toggleCouponStatus).
        cupon = cupon_factory()
        api.force_authenticate(administrador)

        respuesta = api.patch(detalle(cupon.id), {'is_active': False}, format='json')

        assert respuesta.status_code == 200
        cupon.refresh_from_db()
        assert cupon.is_active is False

    def test_el_interruptor_no_falla_por_un_dato_viejo_que_no_se_esta_tocando(
        self, api, administrador, cupon_factory
    ):
        # Un cupon heredado con un porcentaje imposible: desactivarlo tiene que
        # poder hacerse. Se valida la transicion, no el estado entero.
        cupon = cupon_factory(discount_type='percentage', discount_value=150)
        api.force_authenticate(administrador)

        assert api.patch(detalle(cupon.id), {'is_active': False}, format='json').status_code == 200

    def test_subir_el_porcentaje_por_encima_de_cien_al_editar_se_rechaza(
        self, api, administrador, cupon_factory
    ):
        cupon = cupon_factory()
        api.force_authenticate(administrador)

        respuesta = api.patch(detalle(cupon.id), {'discount_value': 150}, format='json')

        assert respuesta.status_code == 400
        cupon.refresh_from_db()
        assert cupon.discount_value == 20

    def test_un_cupon_inexistente_devuelve_404(self, api, administrador):
        api.force_authenticate(administrador)

        assert api.patch(detalle(999999), {'is_active': False}, format='json').status_code == 404
        assert api.delete(detalle(999999)).status_code == 404

    def test_el_detalle_solo_acepta_patch_y_delete(self, api, administrador, cupon_factory):
        # El contrato de la pantalla no pide GET de detalle ni PUT.
        cupon = cupon_factory()
        api.force_authenticate(administrador)

        assert api.get(detalle(cupon.id)).status_code == 405
        assert api.put(detalle(cupon.id), {'code': 'X'}, format='json').status_code == 405


# ---------------------------------------------------------------------------
# 6 · Baja
# ---------------------------------------------------------------------------
class TestBaja:
    def test_la_baja_borra_el_cupon(self, api, administrador, cupon_factory):
        cupon = cupon_factory()
        api.force_authenticate(administrador)

        respuesta = api.delete(detalle(cupon.id))

        assert respuesta.status_code == 204
        assert not Coupon.objects.filter(pk=cupon.pk).exists()

    def test_la_baja_no_arrastra_las_compras_que_lo_usaron(
        self, api, administrador, alumno, cupon_factory, academia_con_vitrina, curso_factory
    ):
        # `Purchase.coupon` es SET_NULL (`models.py:47-54`). Si algun dia
        # alguien lo cambia a CASCADE, borrar un cupon borraria ventas reales y
        # este test es el unico que lo grita.
        cupon = cupon_factory()
        curso = curso_factory(academia_con_vitrina)
        compra = Purchase.objects.create(
            user=alumno, course=curso, amount=500, coupon=cupon,
            original_amount=600, discount_amount=100,
            status=Purchase.Status.COMPLETED,
        )
        api.force_authenticate(administrador)

        api.delete(detalle(cupon.id))

        compra.refresh_from_db()
        assert compra.coupon is None
        assert compra.discount_amount == 100


# ---------------------------------------------------------------------------
# 7 · Listado: filtros, busqueda, forma y consultas
# ---------------------------------------------------------------------------
class TestUltimoUso:
    """`last_used_at` es DERIVADO de las compras, no una columna del cupon.

    Decidido por Emanuel el 2026-09-17 para no pedir una migracion. La pantalla
    lo lee en `CouponManagement.jsx:158` para la tarjeta "Usados hoy"; mientras
    el campo no llegaba, esa tarjeta marcaba 0 sin dar ningun error.
    """

    @staticmethod
    def _compra(usuario, curso, cupon, estado, pagada_en):
        return Purchase.objects.create(
            user=usuario, course=curso, coupon=cupon, amount=100,
            status=estado, paid_at=pagada_en,
        )

    def test_un_cupon_sin_compras_no_tiene_fecha_de_uso(
        self, api, administrador, cupon_factory
    ):
        cupon_factory(code='SINUSO')
        api.force_authenticate(administrador)

        fila = api.get(LISTA).json()['results'][0]

        assert fila['last_used_at'] is None

    def test_devuelve_la_fecha_de_la_compra_mas_reciente(
        self, api, administrador, cupon_factory, alumno, instructor,
        academia_con_vitrina, curso_factory,
    ):
        # Dos cursos porque Purchase tiene unique_together (user, course): el
        # mismo alumno no puede comprar dos veces lo mismo.
        cupon = cupon_factory(code='DOSUSOS')
        vieja = timezone.now() - timedelta(days=10)
        reciente = timezone.now() - timedelta(days=1)
        self._compra(alumno, curso_factory(academia_con_vitrina, 'Curso A'),
                     cupon, Purchase.Status.COMPLETED, vieja)
        self._compra(alumno, curso_factory(academia_con_vitrina, 'Curso B'),
                     cupon, Purchase.Status.COMPLETED, reciente)
        api.force_authenticate(administrador)

        fila = api.get(LISTA).json()['results'][0]

        assert fila['last_used_at'] is not None
        assert fila['last_used_at'].startswith(reciente.date().isoformat())

    def test_una_compra_sin_cobrar_no_cuenta_como_uso(
        self, api, administrador, cupon_factory, alumno,
        academia_con_vitrina, curso_factory,
    ):
        # Un carrito abandonado deja la compra en `pending`. Si contara, la
        # pantalla diria que el cupon se uso cuando nadie pago nada.
        cupon = cupon_factory(code='PENDIENTE')
        self._compra(alumno, curso_factory(academia_con_vitrina), cupon,
                     Purchase.Status.PENDING, timezone.now())
        api.force_authenticate(administrador)

        fila = api.get(LISTA).json()['results'][0]

        assert fila['last_used_at'] is None

    def test_el_alta_responde_con_fecha_nula_y_no_revienta(
        self, api, administrador, payload_valido
    ):
        # La instancia del POST no pasa por el selector, asi que no trae la
        # anotacion. Leerla directo seria un AttributeError: un 500 en el alta.
        api.force_authenticate(administrador)

        respuesta = api.post(LISTA, payload_valido, format='json')

        assert respuesta.status_code == 201
        assert respuesta.json()['last_used_at'] is None

    def test_derivar_la_fecha_no_agrega_una_consulta_por_cupon(
        self, api, administrador, django_assert_num_queries, alumno,
        academia_con_vitrina, curso_factory,
    ):
        # La derivacion es un Max con filter dentro de la consulta de la pagina.
        # Si alguien la mueve a un SerializerMethodField que consulte por fila,
        # este test cae: son 3 consultas con 3 cupones y con 30.
        for i in range(3):
            cupon = Coupon.objects.create(
                code=f'FECHA-{i}', discount_type='percentage', discount_value=5,
            )
            self._compra(alumno, curso_factory(academia_con_vitrina, f'Curso {i}'),
                         cupon, Purchase.Status.COMPLETED, timezone.now())
        api.force_authenticate(administrador)

        with django_assert_num_queries(3):
            respuesta = api.get(LISTA)

        fechas = [c['last_used_at'] for c in respuesta.json()['results']]
        assert all(f is not None for f in fechas)


class TestListado:
    def test_el_filtro_is_active_separa_activos_de_inactivos(
        self, api, administrador, cupon_factory
    ):
        cupon_factory(code='ACTIVO1', is_active=True)
        cupon_factory(code='INACTIVO1', is_active=False)
        api.force_authenticate(administrador)

        activos = [c['code'] for c in api.get(f'{LISTA}?is_active=true').json()['results']]
        inactivos = [c['code'] for c in api.get(f'{LISTA}?is_active=false').json()['results']]

        assert activos == ['ACTIVO1']
        assert inactivos == ['INACTIVO1']

    def test_el_filtro_discount_type_separa_porcentaje_de_monto_fijo(
        self, api, administrador, cupon_factory
    ):
        cupon_factory(code='PORCENTAJE1', discount_type='percentage')
        cupon_factory(code='FIJO1', discount_type='fixed', discount_value=250)
        api.force_authenticate(administrador)

        porcentajes = [c['code'] for c in api.get(f'{LISTA}?discount_type=percentage').json()['results']]
        fijos = [c['code'] for c in api.get(f'{LISTA}?discount_type=fixed').json()['results']]

        assert porcentajes == ['PORCENTAJE1']
        assert fijos == ['FIJO1']

    def test_la_busqueda_encuentra_por_fragmento_del_codigo(
        self, api, administrador, cupon_factory
    ):
        cupon_factory(code='VERANO20')
        cupon_factory(code='INVIERNO15')
        api.force_authenticate(administrador)

        codigos = [c['code'] for c in api.get(f'{LISTA}?search=VERA').json()['results']]

        assert codigos == ['VERANO20']

    def test_un_porcentaje_en_la_busqueda_no_devuelve_todo(
        self, api, administrador, cupon_factory
    ):
        # Un `icontains` sin escapar convierte el `%` del usuario en comodin y
        # el filtro deja de acotar. Django lo escapa; esto lo comprueba.
        cupon_factory(code='VERANO20')
        cupon_factory(code='INVIERNO15')
        api.force_authenticate(administrador)

        assert api.get(f'{LISTA}?search=%').json()['results'] == []

    def test_el_listado_expone_times_used_con_el_valor_del_contador(
        self, api, administrador, cupon_factory
    ):
        # La pantalla lee `times_used` (`CouponManagement.jsx:163`); el modelo
        # guarda `current_uses`. El mapeo vive en el serializer.
        cupon = cupon_factory()
        Coupon.objects.filter(pk=cupon.pk).update(current_uses=3)
        api.force_authenticate(administrador)

        fila = api.get(LISTA).json()['results'][0]

        assert fila['times_used'] == 3

    def test_el_listado_viene_paginado_con_count_y_results(self, api, administrador, cupon_factory):
        cupon_factory(code='UNO')
        api.force_authenticate(administrador)

        datos = api.get(LISTA).json()

        assert set(['count', 'next', 'previous', 'results']) <= set(datos)
        assert datos['count'] == 1

    def test_el_listado_respeta_el_page_size_que_pide_la_pantalla(
        self, api, administrador, cupon_factory
    ):
        for i in range(5):
            cupon_factory(code=f'CUPON{i}')
        api.force_authenticate(administrador)

        datos = api.get(f'{LISTA}?page_size=2').json()

        assert len(datos['results']) == 2
        assert datos['count'] == 5

    def test_un_page_size_enorme_queda_acotado_por_el_techo(self, api, administrador):
        # Sin techo, un `?page_size=1000000` serializa la tabla entera --con su
        # M2M-- en el hilo de la peticion.
        Coupon.objects.bulk_create([
            Coupon(code=f'MASIVO{i}', discount_type='percentage', discount_value=5)
            for i in range(205)
        ])
        api.force_authenticate(administrador)

        datos = api.get(f'{LISTA}?page_size=1000').json()

        assert datos['count'] == 205
        assert len(datos['results']) == 200

    def test_el_listado_no_tiene_n_mas_uno(
        self, api, administrador, django_assert_num_queries, academia_con_vitrina, curso_factory
    ):
        # `applicable_courses` es M2M: sin prefetch, cada cupon del listado
        # agrega una consulta. El numero exacto importa menos que el hecho de
        # que NO crezca al agregar cupones.
        curso = curso_factory(academia_con_vitrina)
        for i in range(3):
            cupon = Coupon.objects.create(
                code=f'NMAS1-{i}', discount_type='percentage', discount_value=5,
            )
            cupon.applicable_courses.add(curso)
        api.force_authenticate(administrador)

        with django_assert_num_queries(3):
            # count · página · 1 sola consulta para los cursos de los 3 cupones.
            # Sin el prefetch del selector son 5, y suben con cada cupón nuevo.
            respuesta = api.get(LISTA)

        assert len(respuesta.json()['results']) == 3
