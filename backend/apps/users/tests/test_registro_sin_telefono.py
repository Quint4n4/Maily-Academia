"""
El telefono deja de ser obligatorio para tener cuenta.

Por que se toca esto: el alta con Google no puede pedir telefono. El token de
identidad que firma Google trae correo, nombre, apellido y foto --nunca un
telefono--, asi que mientras `phone` fuera obligatorio no habia forma de dar de
alta a nadie por ese camino.

La trampa que cuidan estos tests esta en la base, no en el serializer:
`users_user_phone_key` es UNIQUE sobre `phone`. Postgres admite tantos NULL como
quieras en una columna unica, pero solo UNA cadena vacia. O sea, guardar el
telefono ausente como '' funciona con el primer usuario y revienta con un 500 en
el segundo. Por eso `User.save()` normaliza a NULL y por eso el test de las dos
cuentas sin telefono es el que de verdad importa aqui.

Lo que NO cambia y se comprueba igual: un telefono mal formado se sigue
rechazando, y uno repetido tambien.
"""
import pytest

from apps.users.models import User

pytestmark = pytest.mark.django_db

URL = '/api/auth/register/'

CONTRASENA = 'Estudiante12345!'


def _alta(api, email, phone=..., **extra):
    """POST al registro publico. `phone=...` significa 'no mandes el campo'."""
    cuerpo = {
        'email': email,
        'first_name': 'Ana',
        'last_name': 'Torres',
        'password': CONTRASENA,
        'password_confirm': CONTRASENA,
        **extra,
    }
    if phone is not ...:
        cuerpo['phone'] = phone
    return api.post(URL, cuerpo, format='json')


class TestAltaSinTelefono:
    def test_se_puede_registrar_sin_mandar_el_campo(self, api):
        respuesta = _alta(api, 'sin-telefono@ejemplo.com')

        assert respuesta.status_code == 201, respuesta.data
        assert User.objects.get(email='sin-telefono@ejemplo.com').phone is None

    def test_el_telefono_vacio_se_guarda_como_nulo_y_no_como_cadena(self, api):
        """
        La cadena vacia es lo que rompe la restriccion unica. Si este test falla
        con `phone == ''`, el siguiente falla con un 500.
        """
        respuesta = _alta(api, 'vacio@ejemplo.com', phone='')

        assert respuesta.status_code == 201, respuesta.data
        guardado = User.objects.get(email='vacio@ejemplo.com').phone
        assert guardado is None, f'se guardo {guardado!r} en vez de NULL'

    def test_dos_cuentas_sin_telefono_conviven(self, api):
        """
        Que dos altas sin telefono entren es el resultado que le importa al
        usuario. Quien lo garantiza --el serializer o `User.save()`-- da igual
        desde aqui; lo comprueban por separado los tests de mas abajo.
        """
        primera = _alta(api, 'una@ejemplo.com')
        segunda = _alta(api, 'otra@ejemplo.com')

        assert primera.status_code == 201, primera.data
        assert segunda.status_code == 201, (
            f'la segunda cuenta sin telefono no entro: HTTP {segunda.status_code} '
            f'-- {segunda.data}'
        )
        assert User.objects.filter(phone__isnull=True).count() == 2


class TestLoQueNoCambia:
    def test_un_telefono_valido_se_sigue_guardando(self, api):
        respuesta = _alta(api, 'con-telefono@ejemplo.com', phone='5512345678')

        assert respuesta.status_code == 201, respuesta.data
        assert User.objects.get(email='con-telefono@ejemplo.com').phone == '5512345678'

    def test_un_telefono_repetido_se_sigue_rechazando(self, api):
        _alta(api, 'primera@ejemplo.com', phone='5512345678')

        respuesta = _alta(api, 'segunda@ejemplo.com', phone='5512345678')

        assert respuesta.status_code == 400
        assert 'phone' in respuesta.data

    @pytest.mark.parametrize('malo', ['123', '55123456789', 'cinco55123', '55 1234 5678'])
    def test_un_telefono_mal_formado_se_sigue_rechazando(self, api, malo):
        respuesta = _alta(api, f'malo-{len(malo)}@ejemplo.com', phone=malo)

        assert respuesta.status_code == 400, (
            f'se acepto {malo!r} como telefono'
        )


class TestElInvarianteEstaEnElModelo:
    """
    El alta por Google no va a pasar por `RegisterSerializer`: creara el usuario
    por su cuenta. Si la normalizacion viviera solo en el serializer, ese camino
    volveria a meter cadenas vacias. Estos dos tests van contra el modelo.
    """

    def test_create_user_con_cadena_vacia_guarda_nulo(self):
        usuario = User.objects.create_user(
            email='directo@ejemplo.com', username='directo',
            password=CONTRASENA, phone='',
        )

        usuario.refresh_from_db()
        assert usuario.phone is None

    def test_dos_usuarios_creados_sin_telefono_no_chocan(self):
        User.objects.create_user(
            email='uno@ejemplo.com', username='uno', password=CONTRASENA, phone='',
        )
        User.objects.create_user(
            email='dos@ejemplo.com', username='dos', password=CONTRASENA, phone='',
        )

        assert User.objects.filter(phone__isnull=True).count() == 2
