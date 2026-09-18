"""
Superadministrador: hay uno, y de verdad manda menos gente que antes.

Que habia antes: `IsSuperAdmin` dejaba pasar a cualquier `role == 'admin'`, a
cualquier staff y a cualquier superuser, y solo miraba `is_super_admin` en una
ultima linea a la que no llegaba nadie. Existian una columna, una clase de
permiso y una ruta llamadas "superadmin" que no distinguian absolutamente nada.

Lo que cuidan estos tests, en orden de lo que costaria caro:

  1. Un administrador normal NO entra a lo reservado. Es el punto entero del
     cambio: si esto vuelve a pasar, el nivel deja de existir otra vez y nadie
     se entera, porque no da error --da acceso de mas--.
  2. Un superuser o un staff SIN el flag tampoco entran. Ese atajo repartia el
     nivel por accidente: `admin@gmail.com` en produccion es superuser con
     `role='student'`.
  3. La base impide un segundo superadministrador. "Que solo exista uno" no se
     cumple con disciplina: el flag no se puede escribir desde la API, asi que
     se toca desde el admin de Django o desde un shell, y una validacion en el
     codigo de la API no cubriria ninguno de esos dos caminos.
"""
import pytest
from django.db import IntegrityError, transaction

from apps.users.models import User

pytestmark = pytest.mark.django_db

CONTRASENA = 'Administrador12345!'


def url_lista(slug):
    return f'/api/admin/sections/{slug}/promo-videos/'


def _usuario(email, **flags):
    return User.objects.create_user(
        email=email, username=email.split('@')[0],
        password=CONTRASENA, **flags,
    )


@pytest.fixture
def administrador(db):
    return _usuario('admin-normal@ejemplo.com', role=User.Role.ADMIN)


@pytest.fixture
def superadministrador(db):
    return _usuario(
        'super@ejemplo.com', role=User.Role.ADMIN, is_super_admin=True,
    )


class TestQuienEntraALoReservado:
    def test_el_superadministrador_entra(
        self, api, superadministrador, academia_con_vitrina
    ):
        api.force_authenticate(superadministrador)

        respuesta = api.get(url_lista(academia_con_vitrina.slug))

        assert respuesta.status_code == 200, respuesta.data

    def test_un_administrador_normal_NO_entra(
        self, api, administrador, academia_con_vitrina
    ):
        """
        El test que justifica el cambio entero. Si esto pasa a 200, el nivel de
        superadministrador ha vuelto a desaparecer.
        """
        api.force_authenticate(administrador)

        respuesta = api.get(url_lista(academia_con_vitrina.slug))

        assert respuesta.status_code == 403, (
            f'un administrador normal entro a lo reservado: HTTP {respuesta.status_code}'
        )

    def test_un_superuser_sin_el_flag_NO_entra(self, api, academia_con_vitrina):
        """
        Ser superuser es un permiso del admin de Django, otra puerta con otro
        proposito. No debe heredar este nivel sin que nadie se lo haya dado.
        """
        superuser = _usuario('superuser@ejemplo.com', is_superuser=True, is_staff=True)
        api.force_authenticate(superuser)

        respuesta = api.get(url_lista(academia_con_vitrina.slug))

        assert respuesta.status_code == 403

    def test_un_alumno_no_entra(self, api, alumno, academia_con_vitrina):
        api.force_authenticate(alumno)
        assert api.get(url_lista(academia_con_vitrina.slug)).status_code == 403

    def test_un_anonimo_no_entra(self, api, academia_con_vitrina):
        assert api.get(url_lista(academia_con_vitrina.slug)).status_code == 401

    def test_tampoco_puede_crear(self, api, administrador, academia_con_vitrina):
        """No basta con cerrar la lectura: el POST crea contenido de portada."""
        api.force_authenticate(administrador)

        respuesta = api.post(
            url_lista(academia_con_vitrina.slug),
            {'title': 'Video colado', 'video_provider': 'youtube', 'video_id': 'abc123'},
            format='json',
        )

        assert respuesta.status_code == 403


class TestSoloPuedeHaberUno:
    def test_un_segundo_superadministrador_lo_rechaza_la_base(
        self, superadministrador
    ):
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                _usuario('otro-super@ejemplo.com', is_super_admin=True)

    def test_pasar_el_flag_a_otro_tambien_choca(self, superadministrador):
        otro = _usuario('candidato@ejemplo.com', role=User.Role.ADMIN)

        otro.is_super_admin = True
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                otro.save(update_fields=['is_super_admin'])

    def test_se_puede_ceder_el_puesto_quitandoselo_al_anterior(
        self, superadministrador
    ):
        """
        La restriccion no debe dejar la plataforma sin salida: cambiar de
        superadministrador tiene que ser posible, quitandoselo a uno y
        dandoselo al otro.
        """
        relevo = _usuario('relevo@ejemplo.com', role=User.Role.ADMIN)

        superadministrador.is_super_admin = False
        superadministrador.save(update_fields=['is_super_admin'])
        relevo.is_super_admin = True
        relevo.save(update_fields=['is_super_admin'])

        assert User.objects.filter(is_super_admin=True).count() == 1
        assert User.objects.get(is_super_admin=True).pk == relevo.pk

    def test_muchos_usuarios_sin_el_flag_conviven(self, db):
        """
        El indice es PARCIAL. Uno normal sobre un booleano dejaria como mucho un
        usuario con false en toda la tabla.
        """
        for i in range(5):
            _usuario(f'normal{i}@ejemplo.com')

        assert User.objects.filter(is_super_admin=False).count() >= 5


class TestElFlagNoSeTocaDesdeLaApi:
    def test_nadie_se_asciende_a_si_mismo_por_la_api(self, api, administrador):
        """
        `is_super_admin` esta en `read_only_fields` de `MeSerializer`. Si algun
        dia se le quita, cualquier administrador se corona a si mismo con un
        PATCH a su propio perfil.
        """
        api.force_authenticate(administrador)

        api.patch('/api/auth/me/', {'is_super_admin': True}, format='json')

        administrador.refresh_from_db()
        assert administrador.is_super_admin is False, (
            'un administrador se ascendio a superadministrador por la API'
        )
