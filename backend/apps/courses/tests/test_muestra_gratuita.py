"""
La muestra gratuita: `Lesson.es_gratuita`.

Abre una leccion a quien no tiene acceso al curso, para poder decir "las
primeras clases gratis y el resto se paga".

Lo que se prueba aqui no es que funcione --eso es lo facil-- sino que NO abra
de mas. Un fallo en este archivo es contenido de pago regalado, o peor,
formacion interna de una empresa saliendo al publico. Por eso la mayoria de los
casos son negativos.
"""
import pytest
from django.urls import reverse

from apps.courses.models import Lesson, Module
from apps.courses.selectors import es_muestra_abierta, puede_ver_esta_leccion

pytestmark = pytest.mark.django_db


def _abrir_la_primera(curso):
    """Marca como muestra la primera leccion del curso y la devuelve."""
    leccion = Lesson.objects.filter(module__course=curso).first()
    leccion.es_gratuita = True
    leccion.save(update_fields=['es_gratuita'])
    return leccion


def _segunda_leccion(curso):
    """Una leccion mas en el mismo curso, esta SIN abrir."""
    modulo = Module.objects.filter(course=curso).first()
    return Lesson.objects.create(
        module=modulo, title='Leccion 2', order=2,
        video_url='https://www.youtube.com/embed/DEPAGO456',
    )


# --- Lo que SI debe abrir ---------------------------------------------------

def test_un_alumno_sin_acceso_ve_la_muestra(api, alumno, curso_factory, academia_con_vitrina):
    curso = curso_factory(academia_con_vitrina)
    leccion = _abrir_la_primera(curso)

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('lesson-video', args=[leccion.id]))

    assert respuesta.status_code == 200
    assert 'url' in respuesta.data


def test_quien_tiene_membresia_sigue_viendolo_todo(
    api, alumno, curso_factory, academia_con_vitrina, dar_membresia,
):
    """La muestra no puede haber roto el acceso normal."""
    curso = curso_factory(academia_con_vitrina)
    dar_membresia(alumno, academia_con_vitrina)
    de_pago = _segunda_leccion(curso)

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('lesson-video', args=[de_pago.id]))

    assert respuesta.status_code == 200


# --- Lo que NO debe abrir ---------------------------------------------------

def test_las_demas_lecciones_del_mismo_curso_siguen_cerradas(
    api, alumno, curso_factory, academia_con_vitrina,
):
    """El caso que da sentido a todo: una abierta no abre las de al lado."""
    curso = curso_factory(academia_con_vitrina)
    _abrir_la_primera(curso)
    de_pago = _segunda_leccion(curso)

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('lesson-video', args=[de_pago.id]))

    assert respuesta.status_code == 404


def test_una_muestra_de_academia_sin_vitrina_no_se_abre(
    api, alumno, curso_factory, academia_cerrada,
):
    """
    AMBITO>> El aislamiento manda sobre la muestra.

    Corporativo CAMSA es formacion interna de empleados. Marcar una de sus
    lecciones como gratuita --por error o por costumbre-- no puede sacarla al
    publico.
    """
    curso = curso_factory(academia_cerrada)
    leccion = _abrir_la_primera(curso)

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('lesson-video', args=[leccion.id]))

    assert respuesta.status_code == 404


def test_una_muestra_en_un_borrador_no_se_abre(
    api, alumno, curso_factory, academia_con_vitrina,
):
    """Marcar lecciones mientras se prepara el curso no lo publica."""
    curso = curso_factory(academia_con_vitrina, status='draft')
    leccion = _abrir_la_primera(curso)

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('lesson-video', args=[leccion.id]))

    assert respuesta.status_code == 404


def test_sin_cuenta_no_hay_muestra(api, curso_factory, academia_con_vitrina):
    """
    La muestra pide sesion iniciada, como el resto.

    Es deliberado: la portada invita a "empezar gratis" creando una cuenta. Sin
    este requisito la muestra seria contenido anonimo y no quedaria a quien
    volver a hablarle.
    """
    curso = curso_factory(academia_con_vitrina)
    leccion = _abrir_la_primera(curso)

    respuesta = api.get(reverse('lesson-video', args=[leccion.id]))

    assert respuesta.status_code in (401, 403)


def test_una_leccion_sin_marcar_no_se_abre_por_estar_en_curso_con_vitrina(
    api, alumno, curso_factory, academia_con_vitrina,
):
    """Tener vitrina no abre nada por si solo: hay que marcar la leccion."""
    curso = curso_factory(academia_con_vitrina)
    leccion = Lesson.objects.filter(module__course=curso).first()

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('lesson-video', args=[leccion.id]))

    assert respuesta.status_code == 404


def test_un_curso_sin_academia_no_abre_muestras(api, alumno, curso_factory):
    """Sin academia no hay vitrina que consultar, y en la duda se cierra."""
    curso = curso_factory(None)
    leccion = _abrir_la_primera(curso)

    assert es_muestra_abierta(leccion) is False

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('lesson-video', args=[leccion.id]))

    assert respuesta.status_code == 404


# --- El valor por defecto ---------------------------------------------------

def test_las_lecciones_nacen_cerradas(curso_factory, academia_con_vitrina):
    """
    Si el defecto fuese `True`, la migracion habria regalado todo el contenido
    que hoy se cobra y nadie se habria enterado hasta ver la factura.
    """
    curso = curso_factory(academia_con_vitrina)
    assert Lesson.objects.filter(module__course=curso, es_gratuita=True).count() == 0


# --- La ficha del curso -----------------------------------------------------

def test_la_vitrina_dice_cuales_son_muestra_pero_no_suelta_la_url(
    api, alumno, curso_factory, academia_con_vitrina,
):
    """
    La ficha marca las lecciones abiertas para poder pintarles el candado o
    quitarselo, pero el video se sigue pidiendo aparte. Un solo sitio decide.
    """
    curso = curso_factory(academia_con_vitrina)
    _abrir_la_primera(curso)
    _segunda_leccion(curso)

    api.force_authenticate(alumno)
    respuesta = api.get(reverse('course-detail', args=[curso.id]))

    assert respuesta.status_code == 200
    lecciones = respuesta.data['modules'][0]['lessons']
    assert [l['es_gratuita'] for l in lecciones] == [True, False]
    for leccion in lecciones:
        assert 'video_url' not in leccion


def test_el_selector_y_la_vista_deciden_lo_mismo(
    alumno, curso_factory, academia_con_vitrina,
):
    """
    `puede_ver_esta_leccion` es la unica fuente de la decision. Si algun dia la
    vista deja de usarla, este test no lo caza -- pero al menos fija que la
    funcion responde lo que la vista responde hoy.
    """
    curso = curso_factory(academia_con_vitrina)
    muestra = _abrir_la_primera(curso)
    de_pago = _segunda_leccion(curso)

    assert puede_ver_esta_leccion(alumno, muestra) is True
    assert puede_ver_esta_leccion(alumno, de_pago) is False
