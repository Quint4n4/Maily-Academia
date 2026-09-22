"""
El filtro de cursos gratuitos que pide la portada publica.

Lo que de verdad hay que vigilar aqui no es el precio: es que un filtro nuevo
sobre el listado NO se salte el aislamiento entre academias. Es el mismo
listado que el P0 del 2026-09-02 dejaba abierto, y anadirle una condicion es
justo el momento en que se cuela una fuga.
"""

from decimal import Decimal

import pytest

from apps.courses.models import Course


def _precio(curso, valor):
    curso.price = Decimal(valor)
    curso.save(update_fields=['price'])
    return curso


@pytest.mark.django_db
class TestElFiltroDeGratuitos:

    def test_sin_el_parametro_salen_todos(self, api, curso_factory, academia_con_vitrina):
        _precio(curso_factory(academia_con_vitrina, titulo='Gratis'), '0')
        _precio(curso_factory(academia_con_vitrina, titulo='De pago'), '499')

        respuesta = api.get('/api/courses/')

        titulos = {c['title'] for c in respuesta.data['results']}
        assert {'Gratis', 'De pago'} <= titulos

    def test_con_free_solo_salen_los_gratuitos(self, api, curso_factory, academia_con_vitrina):
        _precio(curso_factory(academia_con_vitrina, titulo='Gratis'), '0')
        _precio(curso_factory(academia_con_vitrina, titulo='De pago'), '499')

        respuesta = api.get('/api/courses/?free=true')

        titulos = {c['title'] for c in respuesta.data['results']}
        assert 'Gratis' in titulos
        assert 'De pago' not in titulos

    @pytest.mark.parametrize('valor, filtra', [
        ('true', True), ('1', True), ('false', False), ('', False), ('cualquiera', False),
    ])
    def test_solo_true_y_1_activan_el_filtro(
        self, api, curso_factory, academia_con_vitrina, valor, filtra,
    ):
        """
        Un `?free=false` que filtrara seria una trampa: el parametro se manda
        asi desde cualquier formulario que no marque la casilla.
        """
        _precio(curso_factory(academia_con_vitrina, titulo='De pago'), '499')

        respuesta = api.get(f'/api/courses/?free={valor}')

        titulos = {c['title'] for c in respuesta.data['results']}
        assert ('De pago' not in titulos) is filtra

    def test_un_anonimo_no_ve_gratuitos_de_una_academia_sin_vitrina(
        self, api, curso_factory, academia_con_vitrina, academia_cerrada,
    ):
        """
        AMBITO>> Que un curso sea gratis no lo hace publico. Corporativo CAMSA
        es onboarding interno: sus cursos no salen aunque cuesten cero.
        """
        _precio(curso_factory(academia_con_vitrina, titulo='Gratis publico'), '0')
        _precio(curso_factory(academia_cerrada, titulo='Gratis interno'), '0')

        respuesta = api.get('/api/courses/?free=true')

        titulos = {c['title'] for c in respuesta.data['results']}
        assert 'Gratis publico' in titulos
        assert 'Gratis interno' not in titulos

    def test_el_borrador_gratuito_tampoco_sale(
        self, api, curso_factory, academia_con_vitrina,
    ):
        """Un curso sin publicar no se anuncia, cueste lo que cueste."""
        _precio(
            curso_factory(academia_con_vitrina, titulo='Borrador gratis', status='draft'), '0',
        )

        respuesta = api.get('/api/courses/?free=true')

        assert 'Borrador gratis' not in {c['title'] for c in respuesta.data['results']}

    def test_trae_lo_que_la_portada_pinta(self, api, curso_factory, academia_con_vitrina):
        """
        La tarjeta necesita portada, titulo y docente. Si el serializer deja de
        mandar alguno, la portada se queda con un hueco y nadie se entera hasta
        verla.
        """
        _precio(curso_factory(academia_con_vitrina, titulo='Gratis'), '0')

        respuesta = api.get('/api/courses/?free=true')

        curso = next(c for c in respuesta.data['results'] if c['title'] == 'Gratis')
        for campo in ('id', 'title', 'thumbnail', 'instructor_name', 'price'):
            assert campo in curso, campo

    def test_sin_gratuitos_devuelve_lista_vacia_y_no_error(
        self, api, curso_factory, academia_con_vitrina,
    ):
        """
        El caso que el diseno no contempla: tres huecos y ningun curso gratis.
        Tiene que responder 200 con cero resultados, no fallar.
        """
        _precio(curso_factory(academia_con_vitrina, titulo='De pago'), '499')

        respuesta = api.get('/api/courses/?free=true')

        assert respuesta.status_code == 200
        assert respuesta.data['count'] == 0
        assert Course.objects.filter(price__lte=0).count() == 0
