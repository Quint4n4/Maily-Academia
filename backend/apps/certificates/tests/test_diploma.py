"""
El modulo de certificados no tenia ni un test hasta hoy, y es el unico que
produce un documento que sale de la plataforma y que el alumno ensena.

Que NO se prueba aqui, a proposito: el texto impreso dentro del PDF. ReportLab
escribe en hexadecimal cualquier cadena con acentos o con el separador "·", asi
que buscar bytes solo funciona con texto ASCII puro y daria una red que falla
justo con los nombres en espanol. El contenido se prueba en `services.py`, que
es donde se decide, y el PDF se prueba como lo que puede probarse sin mentir:
que sale un PDF valido y que los casos limite no lo revientan.
"""

import io

import pytest
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as reportlab_canvas

from apps.certificates.models import Certificate
from apps.certificates.pdf import DatosDelDiploma, _tamano_que_cabe, dibujar_diploma
from apps.certificates.services import (
    academia_de,
    datos_del_diploma,
    emitir_certificado,
    fecha_larga,
    nombre_de,
)
from apps.progress.models import LessonProgress


@pytest.fixture
def curso(curso_factory, academia_con_vitrina):
    return curso_factory(academia_con_vitrina, titulo='Introducción a la Longevidad')


@pytest.fixture
def curso_ajeno(curso_factory, academia_cerrada):
    return curso_factory(academia_cerrada, titulo='Inducción interna CAMSA')


def _completar_todas_las_lecciones(alumno, curso):
    for modulo in curso.modules.all():
        for leccion in modulo.lessons.all():
            LessonProgress.objects.create(user=alumno, lesson=leccion, completed=True)


# ---------------------------------------------------------------------------
# Lo emitido no se mueve
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestElDiplomaSeCongela:
    """
    El fallo que cierra esta rama: el PDF se dibujaba leyendo `course.title` y
    `course.instructor` en CADA descarga, asi que renombrar un curso reescribia
    todos los diplomas ya emitidos, incluidos los descargados meses antes.
    """

    def test_al_emitir_se_guardan_los_cuatro_datos(self, alumno, curso):
        certificado = emitir_certificado(alumno, curso)

        assert certificado.student_name == nombre_de(alumno)
        assert certificado.course_title == 'Introducción a la Longevidad'
        assert certificado.instructor_name == nombre_de(curso.instructor)
        assert certificado.section_name == 'Academia con vitrina'

    def test_renombrar_el_curso_no_toca_el_diploma_ya_emitido(self, alumno, curso):
        certificado = emitir_certificado(alumno, curso)

        curso.title = 'Otro nombre completamente distinto'
        curso.save(update_fields=['title'])
        certificado.refresh_from_db()

        assert datos_del_diploma(certificado).curso == 'Introducción a la Longevidad'

    def test_cambiar_de_maestro_no_toca_el_diploma_ya_emitido(self, alumno, curso, django_user_model):
        certificado = emitir_certificado(alumno, curso)
        nombre_original = certificado.instructor_name

        otro = django_user_model.objects.create_user(
            email='otro@ejemplo.com', username='otro',
            password='Profesor12345!', role='instructor',
        )
        curso.instructor = otro
        curso.save(update_fields=['instructor'])
        certificado.refresh_from_db()

        assert datos_del_diploma(certificado).maestro == nombre_original

    def test_emitir_dos_veces_devuelve_el_mismo_certificado(self, alumno, curso):
        primero = emitir_certificado(alumno, curso)
        segundo = emitir_certificado(alumno, curso)

        assert primero.pk == segundo.pk
        assert Certificate.objects.filter(user=alumno, course=curso).count() == 1

    def test_un_diploma_viejo_sin_copia_cae_a_la_relacion_viva(self, alumno, curso):
        """Los emitidos antes de la migracion 0004 no tienen copia congelada."""
        certificado = Certificate.objects.create(user=alumno, course=curso)

        datos = datos_del_diploma(certificado)

        assert datos.curso == curso.title
        assert datos.alumno == nombre_de(alumno)


# ---------------------------------------------------------------------------
# Reclamar
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReclamarElDiploma:

    def test_un_curso_que_no_existe_da_404_y_no_500(self, api, alumno):
        """Antes era `Course.objects.get(pk=...)` pelado: un id inventado reventaba."""
        api.force_authenticate(alumno)

        respuesta = api.post('/api/certificates/claim/999999/')

        assert respuesta.status_code == 404

    def test_un_curso_de_una_academia_ajena_da_404(
        self, api, alumno, curso, curso_ajeno, dar_membresia, academia_con_vitrina,
    ):
        """
        AMBITO>> El alumno SI tiene membresia --en su academia-- y aun asi el
        curso de la academia cerrada no existe para el.

        La membresia de su propia academia no sobra: sin ella el 404 saldria
        por no tener ninguna, y el test pasaria sin probar el aislamiento.

        404 y no 403: un 403 confirmaria que el curso existe.
        """
        dar_membresia(alumno, academia_con_vitrina)
        api.force_authenticate(alumno)
        _completar_todas_las_lecciones(alumno, curso_ajeno)

        respuesta = api.post(f'/api/certificates/claim/{curso_ajeno.id}/')

        assert respuesta.status_code == 404
        assert not Certificate.objects.filter(user=alumno, course=curso_ajeno).exists()

    def test_sin_terminar_las_lecciones_no_hay_diploma(
        self, api, alumno, curso, dar_membresia, academia_con_vitrina,
    ):
        dar_membresia(alumno, academia_con_vitrina)
        api.force_authenticate(alumno)

        respuesta = api.post(f'/api/certificates/claim/{curso.id}/')

        assert respuesta.status_code == 400
        assert not Certificate.objects.filter(user=alumno, course=curso).exists()

    def test_con_todo_completo_se_emite_y_queda_congelado(
        self, api, alumno, curso, dar_membresia, academia_con_vitrina,
    ):
        dar_membresia(alumno, academia_con_vitrina)
        api.force_authenticate(alumno)
        _completar_todas_las_lecciones(alumno, curso)

        respuesta = api.post(f'/api/certificates/claim/{curso.id}/')

        assert respuesta.status_code == 201
        certificado = Certificate.objects.get(user=alumno, course=curso)
        assert certificado.course_title == 'Introducción a la Longevidad'
        assert certificado.section_name == 'Academia con vitrina'


# ---------------------------------------------------------------------------
# Descargar
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDescargarElDiploma:

    def test_el_dueno_recibe_un_pdf(self, api, alumno, curso):
        certificado = emitir_certificado(alumno, curso)
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')

        assert respuesta.status_code == 200
        assert respuesta['Content-Type'] == 'application/pdf'
        assert respuesta.content[:4] == b'%PDF'

    def test_el_diploma_de_otro_da_404(self, api, alumno, curso, django_user_model):
        """
        404 y no 403: sobre un documento con el nombre completo de alguien,
        confirmar que existe ya es informacion. Punto 10 de security-checklist.
        """
        certificado = emitir_certificado(alumno, curso)
        intruso = django_user_model.objects.create_user(
            email='intruso@ejemplo.com', username='intruso',
            password='Estudiante12345!', role='student',
        )
        api.force_authenticate(intruso)

        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')

        assert respuesta.status_code == 404

    def test_sin_iniciar_sesion_no_se_descarga(self, api, alumno, curso):
        certificado = emitir_certificado(alumno, curso)

        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')

        assert respuesta.status_code in (401, 403)


# ---------------------------------------------------------------------------
# El contenido que alimenta al PDF
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLoQueSeImprime:

    def test_el_qr_apunta_a_la_pagina_de_verificacion(self, alumno, curso, settings):
        settings.FRONTEND_URL = 'https://academy360.mx/'
        certificado = emitir_certificado(alumno, curso)

        datos = datos_del_diploma(certificado)

        esperado = f'https://academy360.mx/verify/{certificado.verification_code}'
        assert datos.url_de_verificacion == esperado
        assert datos.codigo == str(certificado.verification_code)

    def test_un_curso_sin_academia_no_rompe_nada(self, alumno, curso):
        """`Course.section` admite null (`on_delete=SET_NULL`)."""
        curso.section = None
        curso.save(update_fields=['section'])

        assert academia_de(curso) == ''
        certificado = emitir_certificado(alumno, curso)
        assert certificado.section_name == ''

    def test_el_nombre_cae_al_usuario_antes_que_al_correo(self, alumno):
        alumno.first_name = ''
        alumno.last_name = ''

        assert nombre_de(alumno) == 'alumno'

    def test_la_fecha_sale_escrita_en_espanol(self, alumno, curso):
        certificado = emitir_certificado(alumno, curso)

        texto = fecha_larga(certificado.issued_at)

        assert ' de ' in texto
        assert not any(mes in texto for mes in ('January', 'September', 'Jan', 'Sep'))


# ---------------------------------------------------------------------------
# El dibujo
# ---------------------------------------------------------------------------


def _datos(**cambios) -> DatosDelDiploma:
    base = dict(
        alumno='Ana Sofía Martínez Ruiz',
        curso='Introducción a la Medicina Regenerativa',
        maestro='María García',
        academia='Maily Academia',
        fecha='21 de septiembre de 2026',
        codigo='3f2a9c1e-7b45-4d8a-9e10-5c6d7f8a9b20',
        url_de_verificacion='https://academy360.mx/verify/3f2a9c1e',
    )
    base.update(cambios)
    return DatosDelDiploma(**base)


class TestElDibujo:
    """Sin base de datos: `dibujar_diploma` solo recibe un `DatosDelDiploma`."""

    def test_sale_un_pdf_valido(self):
        buffer = io.BytesIO()

        dibujar_diploma(buffer, _datos())

        crudo = buffer.getvalue()
        assert crudo[:4] == b'%PDF'
        assert b'%%EOF' in crudo

    @pytest.mark.parametrize(
        'caso, cambios',
        [
            ('nombre larguisimo', {'alumno': 'María Fernanda de la Concepción Rodríguez Sánchez'}),
            ('curso larguisimo', {'curso': 'Protocolos Avanzados de Longevidad Celular y Manejo '
                                           'Clínico Integral del Paciente Geriátrico en Consulta'}),
            ('sin academia', {'academia': ''}),
            ('sin maestro', {'maestro': ''}),
            ('todo vacio', {'alumno': '', 'curso': '', 'maestro': '', 'academia': ''}),
        ],
    )
    def test_los_casos_limite_no_lo_revientan(self, caso, cambios):
        buffer = io.BytesIO()

        dibujar_diploma(buffer, _datos(**cambios))

        assert buffer.getvalue()[:4] == b'%PDF', caso

    def test_un_nombre_largo_baja_de_tamano_hasta_caber(self):
        """
        Sin esto un nombre largo se sale del marco y toca el borde del diploma.
        El ancho es el real del diploma: A4 horizontal menos 60 mm de margenes.
        """
        pdf = reportlab_canvas.Canvas(io.BytesIO())
        largo = 'María Fernanda de la Concepción Rodríguez Sánchez'
        ancho_util = (297 - 60) * mm

        tamano = _tamano_que_cabe(pdf, largo, 'Helvetica-BoldOblique', 30, ancho_util, 16)

        assert tamano < 30
        assert pdf.stringWidth(largo, 'Helvetica-BoldOblique', tamano) <= ancho_util

    def test_el_minimo_manda_aunque_no_quepa(self):
        """
        Limitacion declarada: la funcion baja hasta `tamano_min` y ahi se para.
        Con un ancho imposible el texto desborda en vez de volverse ilegible.

        En el diploma no pasa --el ancho util es de 237 mm-- pero si alguien
        estrecha una zona, esto es lo que ocurre, y mejor que este escrito.
        """
        pdf = reportlab_canvas.Canvas(io.BytesIO())
        largo = 'María Fernanda de la Concepción Rodríguez Sánchez'

        tamano = _tamano_que_cabe(pdf, largo, 'Helvetica-BoldOblique', 30, 100, 16)

        assert tamano == 16
        assert pdf.stringWidth(largo, 'Helvetica-BoldOblique', tamano) > 100

    def test_un_texto_corto_conserva_el_tamano_grande(self):
        pdf = reportlab_canvas.Canvas(io.BytesIO())

        tamano = _tamano_que_cabe(pdf, 'Luis Pérez', 'Helvetica-BoldOblique', 30, 500, 16)

        assert tamano == 30
