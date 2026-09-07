"""
Selectores: la puerta unica por la que se lee un curso.

Sesion 6 del plan. `aislamiento-de-datos` lo dice sin rodeos:

    Toda lectura de un objeto por id pasa por un selector. Un
    Model.objects.get(id=...) directo en la vista es la forma canonica de
    saltarse el filtro. Un repo con capa_de_servicios: ninguna filtra mal por
    diseno, no por descuido.

Lo confirmamos el 2026-09-07: el P0 cerro la LECTURA del catalogo, pero
`EnrollView` seguia haciendo `Course.objects.get(pk=course_id)` a pelo, asi que
un alumno de una academia podia INSCRIBIRSE en un curso de otra con solo saber
el id. Y un id inexistente devolvia 500.

Estos tests fijan la regla en las dos direcciones: leer y escribir.
"""
import pytest

pytestmark = pytest.mark.django_db


class TestInscripcion:
    def test_no_se_puede_inscribir_en_una_academia_ajena(
        self, api, alumno, academia_cerrada, curso_factory
    ):
        from apps.progress.models import Enrollment

        curso = curso_factory(academia_cerrada)
        curso.price = 0
        curso.save()
        api.force_authenticate(alumno)

        respuesta = api.post(f'/api/courses/{curso.id}/enroll/', {}, format='json')

        assert respuesta.status_code == 404, (
            f'un alumno sin membresia se inscribio: HTTP {respuesta.status_code}'
        )
        assert not Enrollment.objects.filter(user=alumno, course=curso).exists()

    def test_un_curso_inexistente_da_404_y_no_500(self, api, alumno):
        api.force_authenticate(alumno)
        respuesta = api.post('/api/courses/999999/enroll/', {}, format='json')
        assert respuesta.status_code == 404, (
            f'un id inexistente revento con HTTP {respuesta.status_code}'
        )

    def test_un_curso_ajeno_y_uno_inexistente_responden_igual(
        self, api, alumno, academia_cerrada, curso_factory
    ):
        curso = curso_factory(academia_cerrada)
        curso.price = 0
        curso.save()
        api.force_authenticate(alumno)

        ajeno = api.post(f'/api/courses/{curso.id}/enroll/', {}, format='json')
        inexistente = api.post('/api/courses/999999/enroll/', {}, format='json')
        assert ajeno.status_code == inexistente.status_code == 404

    def test_si_se_puede_inscribir_en_su_propia_academia(
        self, api, alumno, academia_cerrada, curso_factory, dar_membresia
    ):
        from apps.progress.models import Enrollment

        curso = curso_factory(academia_cerrada)
        curso.price = 0
        curso.save()
        dar_membresia(alumno, academia_cerrada)
        api.force_authenticate(alumno)

        respuesta = api.post(f'/api/courses/{curso.id}/enroll/', {}, format='json')
        assert respuesta.status_code == 201, respuesta.content
        assert Enrollment.objects.filter(user=alumno, course=curso).exists()

    def test_un_curso_de_paga_sigue_rechazando_la_inscripcion_gratuita(
        self, api, alumno, academia_con_vitrina, curso_factory, dar_membresia
    ):
        """El arreglo del ambito no debe tapar la regla de negocio que ya existia."""
        curso = curso_factory(academia_con_vitrina)
        curso.price = 500
        curso.save()
        dar_membresia(alumno, academia_con_vitrina)
        api.force_authenticate(alumno)

        respuesta = api.post(f'/api/courses/{curso.id}/enroll/', {}, format='json')
        assert respuesta.status_code == 400
        assert 'pago' in respuesta.json().get('detail', '').lower()


class TestSelectores:
    def test_el_selector_de_lectura_respeta_el_ambito(
        self, alumno, academia_cerrada, academia_con_vitrina, curso_factory
    ):
        from apps.courses.selectors import cursos_visibles_para

        propio = curso_factory(academia_con_vitrina, 'Con vitrina')
        ajeno = curso_factory(academia_cerrada, 'Sin vitrina')

        visibles = cursos_visibles_para(alumno)
        assert propio in visibles
        assert ajeno not in visibles

    def test_el_selector_devuelve_404_y_no_una_excepcion_de_django(
        self, alumno, academia_cerrada, curso_factory
    ):
        from django.http import Http404
        from apps.courses.selectors import curso_visible_o_404

        curso = curso_factory(academia_cerrada)
        with pytest.raises(Http404):
            curso_visible_o_404(alumno, curso.id)
        with pytest.raises(Http404):
            curso_visible_o_404(alumno, 999999)


class TestOtrasVistasQueOlvidabanElAmbito:
    """
    Encontradas el 2026-09-07 al migrar al selector, y son la prueba del punto:
    el filtro estaba puesto en unas vistas y faltaba en otras porque cada una
    decidia sola.
    """

    def test_los_recomendados_no_cruzan_academias(
        self, api, alumno, academia_cerrada, academia_con_vitrina, curso_factory, dar_membresia
    ):
        curso_factory(academia_cerrada, 'Curso interno de otra academia')
        curso_factory(academia_con_vitrina, 'Curso de la suya')
        dar_membresia(alumno, academia_con_vitrina)
        api.force_authenticate(alumno)

        datos = api.get('/api/courses/recommended/').json()
        resultados = datos.get('results', datos if isinstance(datos, list) else [])
        titulos = [c['title'] for c in resultados]

        assert 'Curso interno de otra academia' not in titulos, (
            'se recomendo un curso de una academia a la que no tiene acceso'
        )

    def test_el_progreso_de_un_curso_inexistente_da_404_y_no_500(self, api, alumno):
        api.force_authenticate(alumno)
        respuesta = api.get('/api/progress/courses/999999/')
        assert respuesta.status_code == 404, (
            f'revento con HTTP {respuesta.status_code}'
        )
