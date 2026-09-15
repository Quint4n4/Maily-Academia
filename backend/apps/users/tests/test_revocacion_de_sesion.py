"""
Revocacion de sesion.

Punto 3 de `security-checklist`, el que dio origen a la Regla 1 del protocolo:
un repo puede tener ROTATE_REFRESH_TOKENS y BLACKLIST_AFTER_ROTATION en True,
tener `token_blacklist` instalado, y aun asi no poder cerrar una sesion.

Era el caso aqui: las tres cosas estaban puestas, pero no existia endpoint de
logout. `POST /api/auth/logout/` devolvia 404 y el frontend solo limpiaba el
`sessionStorage` del navegador, asi que **el refresh token seguia valido en el
servidor durante 7 dias**. Quien tuviera una copia conservaba el acceso aunque el
usuario hubiera cerrado sesion, y el usuario no tenia forma de invalidarlo.

Estos casos se contestan provocando el efecto, no leyendo settings.py.
"""
import pytest

pytestmark = pytest.mark.django_db


@pytest.fixture
def credenciales():
    return {'email': 'sesion@ejemplo.com', 'password': 'Estudiante12345!'}


@pytest.fixture
def usuario(db, credenciales):
    from apps.users.models import User
    return User.objects.create_user(
        email=credenciales['email'], username='sesion',
        password=credenciales['password'], role='student',
    )


def _iniciar_sesion(api, credenciales):
    respuesta = api.post('/api/auth/login/', credenciales, format='json')
    assert respuesta.status_code == 200, respuesta.content
    return respuesta.json()


class TestCerrarSesion:
    def test_el_refresh_deja_de_servir_despues_de_cerrar_sesion(
        self, api, usuario, credenciales
    ):
        tokens = _iniciar_sesion(api, credenciales)

        # Antes de cerrar: el refresh sirve.
        assert api.post(
            '/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json'
        ).status_code == 200

        # Se vuelve a iniciar sesion porque el refresh anterior ya rotó.
        tokens = _iniciar_sesion(api, credenciales)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        cierre = api.post('/api/auth/logout/', {'refresh': tokens['refresh']}, format='json')
        assert cierre.status_code == 205, cierre.content

        # Despues de cerrar: el mismo refresh ya no sirve.
        reintento = api.post(
            '/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json'
        )
        assert reintento.status_code == 401, (
            'el refresh sigue vivo despues de cerrar sesion'
        )

    def test_cerrar_sesion_dos_veces_no_revienta(self, api, usuario, credenciales):
        tokens = _iniciar_sesion(api, credenciales)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        primero = api.post('/api/auth/logout/', {'refresh': tokens['refresh']}, format='json')
        assert primero.status_code == 205

        # El segundo intento no debe dar 500: cerrar una sesion ya cerrada es
        # algo que pasa en cuanto alguien tiene dos pestanas abiertas.
        segundo = api.post('/api/auth/logout/', {'refresh': tokens['refresh']}, format='json')
        assert segundo.status_code in (205, 400), segundo.content

    def test_sin_refresh_responde_400_y_no_500(self, api, usuario, credenciales):
        tokens = _iniciar_sesion(api, credenciales)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        respuesta = api.post('/api/auth/logout/', {}, format='json')
        assert respuesta.status_code == 400, respuesta.content

    def test_un_refresh_inventado_no_revienta(self, api, usuario, credenciales):
        tokens = _iniciar_sesion(api, credenciales)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        respuesta = api.post(
            '/api/auth/logout/', {'refresh': 'esto-no-es-un-token'}, format='json'
        )
        assert respuesta.status_code == 400, respuesta.content

    def test_no_se_puede_cerrar_la_sesion_de_otro(self, api, usuario, credenciales):
        """El refresh de A no se revoca presentandolo con el access de B."""
        from apps.users.models import User

        otro = User.objects.create_user(
            email='otro@ejemplo.com', username='otro',
            password='Estudiante12345!', role='student',
        )
        tokens_victima = _iniciar_sesion(api, credenciales)
        tokens_atacante = _iniciar_sesion(
            api, {'email': otro.email, 'password': 'Estudiante12345!'}
        )

        api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens_atacante['access']}")
        api.post('/api/auth/logout/', {'refresh': tokens_victima['refresh']}, format='json')

        # Pase lo que pase con el codigo de respuesta, la sesion de la victima sigue viva.
        api.credentials()
        reintento = api.post(
            '/api/auth/refresh/', {'refresh': tokens_victima['refresh']}, format='json'
        )
        assert reintento.status_code == 200, (
            'un usuario pudo revocar la sesion de otro'
        )

    def test_cerrar_sesion_exige_estar_autenticado(self, api, usuario, credenciales):
        tokens = _iniciar_sesion(api, credenciales)
        api.credentials()  # sin cabecera de autenticacion

        respuesta = api.post('/api/auth/logout/', {'refresh': tokens['refresh']}, format='json')
        assert respuesta.status_code == 401, respuesta.content
