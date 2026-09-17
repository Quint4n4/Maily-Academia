"""
Cuantos alumnos ven los cursos de un profesor.

Lo que cuidan estos tests, en orden de lo que costaria caro:

  1. Un profesor NO ve la actividad de los cursos de otro. `LessonProgress` no
     tiene campo de academia: su ambito se deriva recorriendo
     leccion -> modulo -> curso -> instructor. Un filtro que se caiga no da
     error, da datos de mas.
  2. Un alumno que ve ocho lecciones es UN alumno, no ocho.
  3. La fila de progreso cuenta aunque la leccion no este completada: se crea al
     guardar la posicion del video, y ese es justo el caso de "la esta viendo".
"""
import pytest
from datetime import timedelta
from django.utils import timezone

from apps.courses.models import Course, Lesson, Module
from apps.progress.models import LessonProgress
from apps.users.models import User

pytestmark = pytest.mark.django_db

URL = '/api/instructor/analytics/views/'


@pytest.fixture
def otro_instructor(db):
    return User.objects.create_user(
        email='otro-profe@ejemplo.com', username='otro-profe',
        password='Profesor12345!', role='instructor',
    )


def _curso_con_leccion(instructor, section, titulo):
    curso = Course.objects.create(
        title=titulo, description='d', instructor=instructor,
        section=section, status='published', level='beginner',
    )
    modulo = Module.objects.create(course=curso, title='M1', order=1)
    leccion = Lesson.objects.create(module=modulo, title='L1', order=1)
    return curso, leccion


def _vio(alumno, leccion, completada=True):
    return LessonProgress.objects.create(
        user=alumno, lesson=leccion, completed=completada,
    )


class TestQuienVeQue:
    def test_un_profesor_no_ve_la_actividad_de_otro(
        self, api, instructor, otro_instructor, alumno, academia_con_vitrina
    ):
        _, mi_leccion = _curso_con_leccion(instructor, academia_con_vitrina, 'Mi curso')
        _, leccion_ajena = _curso_con_leccion(otro_instructor, academia_con_vitrina, 'Curso ajeno')
        _vio(alumno, mi_leccion)
        _vio(alumno, leccion_ajena)

        api.force_authenticate(otro_instructor)
        datos = api.get(f'{URL}?period=month').json()

        titulos = [c['title'] for c in datos['top_courses']]
        assert titulos == ['Curso ajeno'], 'el ranking se ha llevado el curso del otro profesor'
        assert datos['total_students'] == 1

    def test_sin_actividad_la_serie_viene_vacia_y_no_revienta(
        self, api, instructor, academia_con_vitrina
    ):
        _curso_con_leccion(instructor, academia_con_vitrina, 'Curso sin alumnos')
        api.force_authenticate(instructor)

        datos = api.get(f'{URL}?period=month').json()

        assert datos['series'] == []
        assert datos['top_courses'] == []
        assert datos['total_students'] == 0


class TestComoSeCuenta:
    def test_un_alumno_que_ve_varias_lecciones_cuenta_una_vez(
        self, api, instructor, alumno, academia_con_vitrina
    ):
        curso = Course.objects.create(
            title='Curso largo', description='d', instructor=instructor,
            section=academia_con_vitrina, status='published', level='beginner',
        )
        modulo = Module.objects.create(course=curso, title='M1', order=1)
        for i in range(8):
            leccion = Lesson.objects.create(module=modulo, title=f'L{i}', order=i)
            _vio(alumno, leccion)
        api.force_authenticate(instructor)

        datos = api.get(f'{URL}?period=month').json()

        assert datos['total_students'] == 1, 'ocho lecciones no son ocho alumnos'
        assert datos['top_courses'][0]['alumnos'] == 1
        assert sum(p['alumnos'] for p in datos['series']) == 1

    def test_una_leccion_empezada_y_no_completada_cuenta_como_vista(
        self, api, instructor, alumno, academia_con_vitrina
    ):
        # Es la fila que crea `LessonPositionUpdateView` al guardar la posicion
        # del video: el alumno la esta viendo ahora mismo.
        _, leccion = _curso_con_leccion(instructor, academia_con_vitrina, 'Curso')
        _vio(alumno, leccion, completada=False)
        api.force_authenticate(instructor)

        datos = api.get(f'{URL}?period=month').json()

        assert datos['total_students'] == 1

    def test_la_actividad_vieja_queda_fuera_del_periodo_corto(
        self, api, instructor, alumno, academia_con_vitrina
    ):
        _, leccion = _curso_con_leccion(instructor, academia_con_vitrina, 'Curso')
        progreso = _vio(alumno, leccion)
        # `completed_at` es auto_now_add, asi que para simular actividad vieja
        # hay que escribirla por fuera del save().
        LessonProgress.objects.filter(pk=progreso.pk).update(
            completed_at=timezone.now() - timedelta(days=60),
        )
        api.force_authenticate(instructor)

        de_un_mes = api.get(f'{URL}?period=day').json()   # ventana de 30 dias
        de_un_ano = api.get(f'{URL}?period=month').json() # ventana de 365 dias

        assert de_un_mes['total_students'] == 0
        assert de_un_ano['total_students'] == 1


class TestEntrada:
    @pytest.mark.parametrize('periodo', ['day', 'week', 'month', 'year'])
    def test_los_cuatro_periodos_responden(self, api, instructor, periodo):
        api.force_authenticate(instructor)
        assert api.get(f'{URL}?period={periodo}').status_code == 200

    def test_un_periodo_inventado_da_400_y_no_se_traga_el_defecto(self, api, instructor):
        api.force_authenticate(instructor)
        respuesta = api.get(f'{URL}?period=decada')
        assert respuesta.status_code == 400

    def test_sin_periodo_usa_mes(self, api, instructor):
        api.force_authenticate(instructor)
        assert api.get(URL).json()['period'] == 'month'

    def test_un_alumno_no_entra(self, api, alumno):
        api.force_authenticate(alumno)
        assert api.get(URL).status_code == 403

    def test_un_anonimo_no_entra(self, api):
        assert api.get(URL).status_code == 401
