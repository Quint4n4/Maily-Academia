"""
Test de fuga entre academias.

El P0 del 2026-09-02: `/api/courses/` y `/api/courses/{id}/` tienen AllowAny y su
queryset solo filtraba por `status`, nunca por academia ni por membresia. Un
usuario sin cuenta obtenia el catalogo, los modulos, las lecciones y las URLs de
video de academias con `require_credentials=True`.

La regla que fija este archivo:

    El catalogo es publico, el contenido no.

Un anonimo puede ver la vitrina de una academia que la permita (titulo, precio,
temario). Nunca puede ver `video_url`, ni nada de una academia sin vitrina.

Ver docs/00-deuda.md y `.claude/PERFIL-DEL-REPO.md`.
"""
import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


def _json(respuesta):
    return respuesta.json()


def _urls_de_video(payload):
    """Extrae todos los video_url que aparezcan, a cualquier profundidad."""
    encontrados = []

    def recorrer(nodo):
        if isinstance(nodo, dict):
            for clave, valor in nodo.items():
                if clave == 'video_url' and valor:
                    encontrados.append(valor)
                recorrer(valor)
        elif isinstance(nodo, list):
            for item in nodo:
                recorrer(item)

    recorrer(payload)
    return encontrados


class TestCatalogoAnonimo:
    def test_el_anonimo_no_ve_cursos_de_una_academia_sin_vitrina(
        self, api, academia_cerrada, academia_con_vitrina, curso_factory
    ):
        curso_factory(academia_cerrada, 'Onboarding interno CAMSA')
        curso_factory(academia_con_vitrina, 'Nutricion clinica')

        datos = _json(api.get('/api/courses/'))
        titulos = [c['title'] for c in datos['results']]

        assert 'Nutricion clinica' in titulos
        assert 'Onboarding interno CAMSA' not in titulos

    def test_el_anonimo_recibe_404_en_el_detalle_de_una_academia_sin_vitrina(
        self, api, academia_cerrada, curso_factory
    ):
        curso = curso_factory(academia_cerrada)

        respuesta = api.get(f'/api/courses/{curso.id}/')

        # 404 y no 403: un 403 confirma que el curso existe y permite contarlos
        # por enumeracion de ids.
        assert respuesta.status_code == 404

    def test_el_anonimo_ve_la_ficha_de_una_academia_con_vitrina_pero_sin_videos(
        self, api, academia_con_vitrina, curso_factory
    ):
        curso = curso_factory(academia_con_vitrina, 'Nutricion clinica')

        respuesta = api.get(f'/api/courses/{curso.id}/')
        assert respuesta.status_code == 200

        datos = _json(respuesta)
        assert datos['title'] == 'Nutricion clinica'
        # El temario si: es lo que vende el curso.
        assert datos['modules'], 'la ficha publica debe traer el temario'
        assert datos['modules'][0]['lessons'], 'y los titulos de las lecciones'
        # Las URLs de video no, en ninguna parte de la respuesta.
        assert _urls_de_video(datos) == [], 'la ficha publica filtro una URL de video'

    def test_un_curso_en_borrador_no_sale_ni_con_vitrina(
        self, api, academia_con_vitrina, curso_factory
    ):
        curso_factory(academia_con_vitrina, 'Borrador', status='draft')

        titulos = [c['title'] for c in _json(api.get('/api/courses/'))['results']]
        assert 'Borrador' not in titulos


class TestCatalogoAutenticado:
    def test_un_alumno_sin_membresia_no_ve_la_academia_cerrada(
        self, api, alumno, academia_cerrada, curso_factory
    ):
        curso = curso_factory(academia_cerrada)
        api.force_authenticate(alumno)

        assert api.get(f'/api/courses/{curso.id}/').status_code == 404

        titulos = [c['title'] for c in _json(api.get('/api/courses/'))['results']]
        assert curso.title not in titulos

    def test_un_alumno_con_membresia_ve_el_curso_completo(
        self, api, alumno, academia_cerrada, curso_factory, dar_membresia
    ):
        curso = curso_factory(academia_cerrada)
        dar_membresia(alumno, academia_cerrada)
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/courses/{curso.id}/')
        assert respuesta.status_code == 200
        # Este si tiene derecho al contenido: las URLs de video deben venir.
        assert _urls_de_video(_json(respuesta)), 'un alumno con acceso debe recibir el video'

    def test_el_instructor_sigue_viendo_sus_propios_cursos(
        self, api, instructor, academia_cerrada, curso_factory, dar_membresia
    ):
        from apps.sections.models import SectionMembership

        curso = curso_factory(academia_cerrada, status='draft')
        dar_membresia(instructor, academia_cerrada, SectionMembership.Role.INSTRUCTOR)
        api.force_authenticate(instructor)

        assert api.get(f'/api/courses/{curso.id}/').status_code == 200
