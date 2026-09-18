"""
Entrar con Google.

Lo que cuidan estos tests, en orden de lo que costaria caro:

  1. Un correo SIN verificar no entra y, sobre todo, no se enlaza con una cuenta
     que ya existe. Es el agujero clasico de este flujo: sin esa condicion, quien
     consiga un token para una direccion sin verificar se mete en la cuenta de
     quien use esa direccion aqui.
  2. Un token que no pasa la verificacion no entra, y el motivo real NO viaja al
     navegador: lo escribe la libreria de Google y puede llevar trozos del token.
  3. La respuesta tiene la MISMA forma que la del login con contrasena. El
     frontend lee una sola, asi que si estas dos se separan, entrar por Google
     deja al usuario en otra academia o sin sesion.
  4. Entrar dos veces no crea dos cuentas.

La verificacion contra Google se sustituye con monkeypatch sobre
`services._verificar_token`: los tests no salen a la red. Lo que se reemplaza es
NUESTRA funcion, no la libreria, para que el resto del servicio --enlazado,
alta, secciones-- corra de verdad.
"""
import pytest

from apps.users import services
from apps.users.models import User

pytestmark = pytest.mark.django_db

URL = '/api/auth/google/'


def _token_de(correo, sub='google-123', verificado=True, **extra):
    """El contenido que Google firmaria para esa persona."""
    return {
        'iss': 'https://accounts.google.com',
        'sub': sub,
        'email': correo,
        'email_verified': verificado,
        'given_name': 'Ana',
        'family_name': 'Torres',
        'picture': 'https://lh3.googleusercontent.com/foto.jpg',
        **extra,
    }


@pytest.fixture
def google_responde(monkeypatch):
    """Deja que el siguiente token que llegue se lea como lo que se le diga."""
    def configurar(contenido):
        monkeypatch.setattr(services, '_verificar_token', lambda credential: contenido)
    return configurar


@pytest.fixture
def google_rechaza(monkeypatch):
    """Google no valida el token. El texto lleva algo que no debe salir."""
    def explota(credential):
        raise services.TokenInvalido('Token used too late, 1600000000 < 1600000001')
    monkeypatch.setattr(services, '_verificar_token', explota)


class TestAltaNueva:
    def test_un_correo_desconocido_entra_y_se_le_crea_la_cuenta(self, api, google_responde):
        google_responde(_token_de('nueva@gmail.com'))

        respuesta = api.post(URL, {'credential': 'lo-que-sea'}, format='json')

        assert respuesta.status_code == 200, respuesta.data
        assert respuesta.data['created'] is True
        usuario = User.objects.get(email='nueva@gmail.com')
        assert usuario.role == User.Role.STUDENT
        assert usuario.google_sub == 'google-123'
        assert usuario.first_name == 'Ana'

    def test_la_cuenta_nueva_no_tiene_telefono_ni_contrasena_usable(
        self, api, google_responde
    ):
        """
        Sin telefono porque Google no lo entrega; sin contrasena usable porque
        nadie ha elegido una y no debe haber ninguna que adivinar.
        """
        google_responde(_token_de('nueva@gmail.com'))
        api.post(URL, {'credential': 'x'}, format='json')

        usuario = User.objects.get(email='nueva@gmail.com')
        assert usuario.phone is None
        assert not usuario.has_usable_password()

    def test_dos_personas_distintas_sin_telefono_conviven(self, api, google_responde):
        """`phone` es UNIQUE: dos cadenas vacias chocarian, dos NULL no."""
        google_responde(_token_de('una@gmail.com', sub='sub-1'))
        primera = api.post(URL, {'credential': 'x'}, format='json')
        google_responde(_token_de('otra@gmail.com', sub='sub-2'))
        segunda = api.post(URL, {'credential': 'x'}, format='json')

        assert primera.status_code == 200, primera.data
        assert segunda.status_code == 200, segunda.data

    def test_entrar_dos_veces_no_crea_dos_cuentas(self, api, google_responde):
        google_responde(_token_de('repetida@gmail.com'))

        primera = api.post(URL, {'credential': 'x'}, format='json')
        segunda = api.post(URL, {'credential': 'x'}, format='json')

        assert primera.data['created'] is True
        assert segunda.data['created'] is False
        assert primera.data['user']['id'] == segunda.data['user']['id']
        assert User.objects.filter(email='repetida@gmail.com').count() == 1


class TestEnlaceConCuentaExistente:
    def test_quien_ya_tenia_cuenta_entra_a_la_suya_y_no_a_una_nueva(
        self, api, alumno, google_responde
    ):
        google_responde(_token_de(alumno.email))

        respuesta = api.post(URL, {'credential': 'x'}, format='json')

        assert respuesta.status_code == 200, respuesta.data
        assert respuesta.data['created'] is False
        assert respuesta.data['user']['id'] == alumno.id
        alumno.refresh_from_db()
        assert alumno.google_sub == 'google-123'

    def test_el_correo_en_mayusculas_encuentra_la_misma_cuenta(
        self, api, alumno, google_responde
    ):
        google_responde(_token_de(alumno.email.upper()))

        respuesta = api.post(URL, {'credential': 'x'}, format='json')

        assert respuesta.data['user']['id'] == alumno.id
        assert User.objects.filter(email__iexact=alumno.email).count() == 1

    def test_un_correo_sin_verificar_NO_entra_ni_enlaza(self, api, alumno, google_responde):
        """
        El test que justifica la comprobacion de `email_verified`. Si esto pasa a
        200, cualquiera que consiga un token con el correo de otro se queda con
        su cuenta, sus cursos y sus certificados.
        """
        google_responde(_token_de(alumno.email, verificado=False))

        respuesta = api.post(URL, {'credential': 'x'}, format='json')

        assert respuesta.status_code == 401, (
            f'entro con un correo sin verificar: HTTP {respuesta.status_code}'
        )
        alumno.refresh_from_db()
        assert alumno.google_sub is None, 'se enlazo la cuenta ajena igualmente'

    def test_el_sub_manda_sobre_el_correo(self, api, alumno, google_responde):
        """
        Si la persona se cambia el correo en Google, sigue siendo la misma cuenta
        aqui. Por eso se guarda el `sub` y no el correo.
        """
        alumno.google_sub = 'sub-estable'
        alumno.save(update_fields=['google_sub'])
        google_responde(_token_de('correo-nuevo@gmail.com', sub='sub-estable'))

        respuesta = api.post(URL, {'credential': 'x'}, format='json')

        assert respuesta.data['user']['id'] == alumno.id
        assert respuesta.data['created'] is False


class TestTokenQueNoSirve:
    def test_un_token_rechazado_da_401(self, api, google_rechaza):
        respuesta = api.post(URL, {'credential': 'basura'}, format='json')

        assert respuesta.status_code == 401
        assert User.objects.count() == 0

    def test_el_motivo_real_no_viaja_al_navegador(self, api, google_rechaza):
        respuesta = api.post(URL, {'credential': 'basura'}, format='json')

        texto = str(respuesta.data)
        assert 'Token used too late' not in texto, 'se filtro el error de la libreria'
        assert '1600000000' not in texto

    def test_sin_credential_da_400(self, api):
        respuesta = api.post(URL, {}, format='json')
        assert respuesta.status_code == 400

    def test_una_cuenta_desactivada_no_entra(self, api, alumno, google_responde):
        alumno.is_active = False
        alumno.save(update_fields=['is_active'])
        google_responde(_token_de(alumno.email))

        respuesta = api.post(URL, {'credential': 'x'}, format='json')

        assert respuesta.status_code == 401


class TestLaRespuestaEsLaMismaQueLaDelLogin:
    def test_trae_las_mismas_claves_que_entrar_con_contrasena(
        self, api, google_responde
    ):
        """
        El frontend lee una sola forma. Si estas dos se separan, entrar por
        Google deja al usuario sin sesion o en la academia equivocada.
        """
        contrasena = 'Estudiante12345!'
        usuario = User.objects.create_user(
            email='ambas@ejemplo.com', username='ambas',
            password=contrasena, role=User.Role.STUDENT,
        )

        con_contrasena = api.post(
            '/api/auth/login/',
            {'email': usuario.email, 'password': contrasena},
            format='json',
        )
        google_responde(_token_de(usuario.email))
        con_google = api.post(URL, {'credential': 'x'}, format='json')

        assert con_contrasena.status_code == 200, con_contrasena.data
        assert con_google.status_code == 200, con_google.data

        esperadas = {'access', 'refresh', 'redirect_section', 'user'}
        assert esperadas <= set(con_contrasena.data.keys())
        assert esperadas <= set(con_google.data.keys())
        assert con_contrasena.data['user'] == con_google.data['user']
        assert con_contrasena.data['redirect_section'] == con_google.data['redirect_section']

    def test_el_token_que_devuelve_sirve_de_verdad(self, api, google_responde):
        google_responde(_token_de('token@gmail.com'))
        datos = api.post(URL, {'credential': 'x'}, format='json').data

        api.credentials(HTTP_AUTHORIZATION=f'Bearer {datos["access"]}')
        yo = api.get('/api/auth/me/')

        assert yo.status_code == 200
        assert yo.data['email'] == 'token@gmail.com'

    def test_un_alumno_nuevo_cae_en_la_academia_publica(self, api, google_responde):
        google_responde(_token_de('publica@gmail.com'))

        datos = api.post(URL, {'credential': 'x'}, format='json').data

        assert datos['redirect_section'] == 'longevity-360'
        assert datos['user']['sections'] == ['longevity-360']

    def test_no_se_regalan_academias_ajenas(self, api, google_responde):
        """
        AMBITO>> entrar por Google no puede dar acceso a lo que no se tenia.
        Una cuenta nueva ve la academia publica y nada mas.
        """
        google_responde(_token_de('ajena@gmail.com'))

        datos = api.post(URL, {'credential': 'x'}, format='json').data

        assert 'corporativo-camsa' not in datos['user']['sections']
        assert 'maily-academia' not in datos['user']['sections']


class TestBloqueoPorIntentosFallidos:
    def test_el_bloqueo_de_contrasena_no_cierra_esta_puerta(
        self, api, alumno, google_responde
    ):
        """
        Decidido a proposito: ese bloqueo frena a quien adivina contrasenas, y
        aqui no se usa ninguna. Respetarlo convertiria una defensa contra fuerza
        bruta en una forma de dejar fuera al usuario legitimo -- basta con fallar
        cinco veces contra su correo para tumbarle tambien el boton de Google.
        """
        for _ in range(User.MAX_LOGIN_ATTEMPTS):
            alumno.increment_failed_attempts()
        alumno.refresh_from_db()
        assert alumno.is_locked, 'el montaje del test no dejo la cuenta bloqueada'

        google_responde(_token_de(alumno.email))
        respuesta = api.post(URL, {'credential': 'x'}, format='json')

        assert respuesta.status_code == 200, respuesta.data
        alumno.refresh_from_db()
        assert not alumno.is_locked, 'entrar por Google no limpio el bloqueo'
        assert alumno.failed_login_attempts == 0
