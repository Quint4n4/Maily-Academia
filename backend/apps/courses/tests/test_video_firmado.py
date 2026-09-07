"""
URLs de video firmadas — sesion 7 del plan.

El modelo ya declaraba varios proveedores, pero el frontend ponia la URL directa
como `src` del iframe para todos salvo YouTube. Una URL directa sin firmar es
publica para cualquiera que la tenga.

Con YouTube publico eso no hacia dano. Con los videos reales de CAMSA si: seria
contenido de pago abierto, y el P0 que cerramos repartia justamente esas URLs.

La firma NO impide compartir el video mientras la URL dure. Impide el acceso
permanente y la indexacion. Lo otro es DRM, cuesta aparte y casi nunca vale la
pena. Conviene saberlo antes de prometerselo a un cliente.
"""
import hashlib
import time

import pytest
from django.test import override_settings

from apps.courses.video import (
    VideoNoConfigurado,
    firmar_embed_bunny,
    url_de_reproduccion,
)

pytestmark = pytest.mark.django_db

LIBRERIA = '759'
CLAVE = 'clave-de-firma-de-prueba'


@pytest.fixture
def leccion_bunny(academia_con_vitrina, curso_factory):
    curso = curso_factory(academia_con_vitrina)
    leccion = curso.modules.first().lessons.first()
    leccion.video_provider = 'bunny'
    leccion.video_url = 'eb1c4f77-0cda-46be-b47d-1118ad7c2ffe'
    leccion.save()
    return leccion


class TestFirma:
    @override_settings(BUNNY_STREAM_LIBRARY_ID=LIBRERIA, BUNNY_STREAM_TOKEN_KEY=CLAVE)
    def test_el_token_es_el_que_espera_bunny(self):
        """
        Formato documentado: SHA256_HEX(clave + video_id + expires).

        Se recalcula aqui a mano: si alguien cambia el orden de concatenacion,
        Bunny devolveria 403 en produccion y este test lo dice antes.
        """
        from urllib.parse import parse_qs, urlparse

        video_id = 'eb1c4f77-0cda-46be-b47d-1118ad7c2ffe'
        url = firmar_embed_bunny(video_id, vigencia=600)

        partes = urlparse(url)
        params = parse_qs(partes.query)
        expira = params['expires'][0]
        esperado = hashlib.sha256(f'{CLAVE}{video_id}{expira}'.encode()).hexdigest()

        assert params['token'][0] == esperado
        assert partes.path == f'/embed/{LIBRERIA}/{video_id}'
        assert partes.netloc == 'iframe.mediadelivery.net'

    @override_settings(BUNNY_STREAM_LIBRARY_ID=LIBRERIA, BUNNY_STREAM_TOKEN_KEY=CLAVE)
    def test_la_expiracion_es_corta_y_en_segundos(self):
        from urllib.parse import parse_qs, urlparse

        url = firmar_embed_bunny('abc', vigencia=600)
        expira = int(parse_qs(urlparse(url).query)['expires'][0])
        ahora = int(time.time())

        assert ahora < expira <= ahora + 601
        # Si alguien lo pusiera en milisegundos, este numero seria enorme.
        assert expira < 10**11, 'expires debe ir en segundos, no en milisegundos'

    @override_settings(BUNNY_STREAM_LIBRARY_ID='', BUNNY_STREAM_TOKEN_KEY='')
    def test_sin_credenciales_se_dice_claro_y_no_se_devuelve_una_url_rota(self):
        with pytest.raises(VideoNoConfigurado):
            firmar_embed_bunny('abc')

    @override_settings(BUNNY_STREAM_LIBRARY_ID=LIBRERIA, BUNNY_STREAM_TOKEN_KEY=CLAVE)
    def test_dos_firmas_del_mismo_video_no_son_iguales_para_siempre(self):
        """Cambian con la expiracion: una URL vieja no revive."""
        a = firmar_embed_bunny('abc', vigencia=60)
        b = firmar_embed_bunny('abc', vigencia=3600)
        assert a != b


class TestSeleccionDeProveedor:
    def test_youtube_se_devuelve_tal_cual(self, academia_con_vitrina, curso_factory):
        curso = curso_factory(academia_con_vitrina)
        leccion = curso.modules.first().lessons.first()
        assert url_de_reproduccion(leccion) == leccion.video_url

    @override_settings(BUNNY_STREAM_LIBRARY_ID=LIBRERIA, BUNNY_STREAM_TOKEN_KEY=CLAVE)
    def test_de_una_url_completa_de_bunny_se_extrae_el_id(self, leccion_bunny):
        leccion_bunny.video_url = f'https://iframe.mediadelivery.net/embed/{LIBRERIA}/vid-123?algo=1'
        leccion_bunny.save()
        assert '/embed/759/vid-123?' in url_de_reproduccion(leccion_bunny)

    def test_un_proveedor_sin_implementar_no_devuelve_una_url_enganosa(
        self, academia_con_vitrina, curso_factory
    ):
        curso = curso_factory(academia_con_vitrina)
        leccion = curso.modules.first().lessons.first()
        leccion.video_provider = 'mux'
        leccion.save()
        with pytest.raises(VideoNoConfigurado):
            url_de_reproduccion(leccion)


class TestControlDeAcceso:
    def test_sin_acceso_al_curso_no_hay_url(
        self, api, alumno, academia_cerrada, curso_factory
    ):
        curso = curso_factory(academia_cerrada)
        leccion = curso.modules.first().lessons.first()
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/courses/lessons/{leccion.id}/video/')
        assert respuesta.status_code == 404
        assert 'url' not in respuesta.json()

    def test_un_anonimo_tampoco(self, api, academia_con_vitrina, curso_factory):
        curso = curso_factory(academia_con_vitrina)
        leccion = curso.modules.first().lessons.first()

        respuesta = api.get(f'/api/courses/lessons/{leccion.id}/video/')
        assert respuesta.status_code == 401

    def test_una_leccion_ajena_y_una_inexistente_responden_igual(
        self, api, alumno, academia_cerrada, curso_factory
    ):
        curso = curso_factory(academia_cerrada)
        leccion = curso.modules.first().lessons.first()
        api.force_authenticate(alumno)

        ajena = api.get(f'/api/courses/lessons/{leccion.id}/video/')
        inexistente = api.get('/api/courses/lessons/999999/video/')
        assert ajena.status_code == inexistente.status_code == 404

    @override_settings(BUNNY_STREAM_LIBRARY_ID=LIBRERIA, BUNNY_STREAM_TOKEN_KEY=CLAVE)
    def test_con_acceso_si_hay_url_firmada(
        self, api, alumno, academia_cerrada, curso_factory, dar_membresia, leccion_bunny
    ):
        # la leccion vive en la academia con vitrina; se le da membresia ahi
        curso = leccion_bunny.module.course
        dar_membresia(alumno, curso.section)
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/courses/lessons/{leccion_bunny.id}/video/')
        assert respuesta.status_code == 200, respuesta.content

        datos = respuesta.json()
        assert 'token=' in datos['url'] and 'expires=' in datos['url']
        assert datos['provider'] == 'bunny'
        assert datos['expira_en'] == 600

    @override_settings(BUNNY_STREAM_LIBRARY_ID=LIBRERIA, BUNNY_STREAM_TOKEN_KEY=CLAVE)
    def test_la_clave_de_firma_no_aparece_en_la_respuesta(
        self, api, alumno, curso_factory, dar_membresia, leccion_bunny
    ):
        """Si la clave viajara, cualquiera podria firmarse sus propias URLs."""
        curso = leccion_bunny.module.course
        dar_membresia(alumno, curso.section)
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/courses/lessons/{leccion_bunny.id}/video/')
        assert CLAVE not in respuesta.content.decode()

    @override_settings(BUNNY_STREAM_LIBRARY_ID='', BUNNY_STREAM_TOKEN_KEY='')
    def test_sin_credenciales_el_endpoint_lo_dice_y_no_da_una_url_rota(
        self, api, alumno, curso_factory, dar_membresia, leccion_bunny
    ):
        curso = leccion_bunny.module.course
        dar_membresia(alumno, curso.section)
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/courses/lessons/{leccion_bunny.id}/video/')
        assert respuesta.status_code == 501
