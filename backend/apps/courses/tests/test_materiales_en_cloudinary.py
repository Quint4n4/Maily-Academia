"""
Los materiales de apoyo viven en Cloudinary, no en el disco del contenedor.

El disco de Railway se recrea en cada despliegue: los PDF desaparecian, la fila
en base de datos sobrevivia, y la descarga respondia 500 mientras el material
seguia listado para el alumno.

Lo que cuidan estos tests:

  1. Lo que se sube va a Cloudinary y NO al disco.
  2. La descarga sigue pasando por el permiso del backend. Estos archivos son de
     cursos de pago: si algun dia se cambia por una redireccion a la URL de
     Cloudinary, quien tenga el enlace se los lleva sin estar inscrito.
  3. Un fallo de Cloudinary no enseña rutas del servidor al usuario.
  4. Borrar el material borra tambien el archivo.
  5. El tope de 10 MB, que es el del plan Free medido contra la cuenta real.

Cloudinary se sustituye con monkeypatch: los tests no salen a la red.
"""
import pytest
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.courses import almacenamiento, views
from apps.courses.models import Course, CourseMaterial, Lesson, Module

pytestmark = pytest.mark.django_db


@pytest.fixture
def curso(instructor, academia_con_vitrina):
    curso = Course.objects.create(
        title='Curso con material', description='d', instructor=instructor,
        section=academia_con_vitrina, status='published', level='beginner',
    )
    modulo = Module.objects.create(course=curso, title='M1', order=1)
    Lesson.objects.create(module=modulo, title='L1', order=1)
    return curso


@pytest.fixture
def cloudinary_falso(monkeypatch):
    """Sustituye la red por un diccionario en memoria."""
    guardados = {}

    def subir(archivo, course_id):
        contenido = archivo.read() if hasattr(archivo, 'read') else b''
        pid = f'materiales/curso_{course_id}/generado_{len(guardados)}'
        guardados[pid] = contenido
        return pid

    def descargar(public_id):
        if public_id not in guardados:
            raise almacenamiento.ErrorDeAlmacenamiento('no existe')
        return guardados[public_id]

    def borrar(public_id):
        guardados.pop(public_id, None)

    monkeypatch.setattr(views, 'subir_material', subir)
    monkeypatch.setattr(views, 'descargar_material', descargar)
    monkeypatch.setattr(views, 'borrar_material', borrar)
    return guardados


def _pdf(nombre='apuntes.pdf', mb=0.001):
    contenido = b'%PDF-1.4\n' + b'0' * int(mb * 1024 * 1024)
    return SimpleUploadedFile(nombre, contenido, content_type='application/pdf')


def _subir(api, usuario, curso, archivo=None):
    api.force_authenticate(usuario)
    return api.post(
        f'/api/courses/{curso.id}/materials/',
        {'title': 'Apuntes', 'file': archivo or _pdf()},
        format='multipart',
    )


class TestDondeSeGuarda:
    def test_el_archivo_va_a_cloudinary_y_no_al_disco(
        self, api, instructor, curso, cloudinary_falso
    ):
        respuesta = _subir(api, instructor, curso)

        assert respuesta.status_code == 201, respuesta.data
        material = CourseMaterial.objects.get()
        assert material.cloudinary_public_id, 'no se guardo el identificador de Cloudinary'
        assert not material.file, 'el archivo se quedo en el disco del contenedor'
        assert len(cloudinary_falso) == 1

    def test_si_cloudinary_falla_el_material_no_se_crea(
        self, api, instructor, curso, monkeypatch
    ):
        def explota(archivo, course_id):
            raise almacenamiento.ErrorDeAlmacenamiento('cuenta sin credito')
        monkeypatch.setattr(views, 'subir_material', explota)

        respuesta = _subir(api, instructor, curso)

        assert respuesta.status_code == 400
        assert CourseMaterial.objects.count() == 0, 'quedo una fila sin archivo detras'
        # El motivo real no se enseña: iria a los registros, no al profesor.
        assert 'crédito' not in str(respuesta.data)


class TestDescarga:
    def test_el_alumno_inscrito_recibe_el_archivo(
        self, api, instructor, alumno, curso, cloudinary_falso, dar_membresia, academia_con_vitrina
    ):
        _subir(api, instructor, curso)
        from apps.progress.models import Enrollment
        Enrollment.objects.create(user=alumno, course=curso)
        dar_membresia(alumno, academia_con_vitrina)
        material = CourseMaterial.objects.get()

        api.force_authenticate(alumno)
        respuesta = api.get(f'/api/materials/{material.id}/download/')

        assert respuesta.status_code == 200
        assert b'%PDF' in b''.join(respuesta.streaming_content if respuesta.streaming else [respuesta.content])

    def test_un_anonimo_no_descarga(self, api, instructor, curso, cloudinary_falso):
        _subir(api, instructor, curso)
        material = CourseMaterial.objects.get()

        api.force_authenticate(None)
        respuesta = api.get(f'/api/materials/{material.id}/download/')

        assert respuesta.status_code == 401

    def test_si_el_archivo_no_esta_no_se_enseña_la_ruta_del_servidor(
        self, api, instructor, curso, cloudinary_falso
    ):
        _subir(api, instructor, curso)
        material = CourseMaterial.objects.get()
        cloudinary_falso.clear()  # el archivo desaparece de Cloudinary

        api.force_authenticate(instructor)
        respuesta = api.get(f'/api/materials/{material.id}/download/')

        assert respuesta.status_code == 502
        texto = str(respuesta.data)
        assert '/app/' not in texto and 'media/' not in texto, 'se filtro una ruta del servidor'

    def test_una_descarga_fallida_no_cuenta_como_descarga(
        self, api, instructor, curso, cloudinary_falso
    ):
        _subir(api, instructor, curso)
        material = CourseMaterial.objects.get()
        cloudinary_falso.clear()

        api.force_authenticate(instructor)
        api.get(f'/api/materials/{material.id}/download/')

        material.refresh_from_db()
        assert material.download_count == 0


class TestBorrado:
    def test_borrar_el_material_borra_el_archivo(
        self, api, instructor, curso, cloudinary_falso
    ):
        _subir(api, instructor, curso)
        material = CourseMaterial.objects.get()
        assert len(cloudinary_falso) == 1

        api.force_authenticate(instructor)
        respuesta = api.delete(f'/api/materials/{material.id}/')

        assert respuesta.status_code == 204
        assert len(cloudinary_falso) == 0, 'el archivo quedo huerfano en Cloudinary'


class TestLimiteDeTamano:
    def test_el_tope_del_modelo_es_el_del_plan_de_cloudinary(self):
        # Medido contra la cuenta real el 2026-09-17: 11 MB responde
        # "File size too large. Got 11534345. Maximum is 10485760".
        assert CourseMaterial.MAX_FILE_SIZE_BYTES == 10 * 1024 * 1024

    def test_un_archivo_de_mas_de_10mb_se_rechaza_antes_de_viajar(
        self, api, instructor, curso, monkeypatch
    ):
        def no_deberia_llamarse(archivo, course_id):
            raise AssertionError('el archivo viajo a Cloudinary pese a pasarse del tope')
        monkeypatch.setattr(views, 'subir_material', no_deberia_llamarse)

        respuesta = _subir(api, instructor, curso, archivo=_pdf('grande.pdf', mb=11))

        assert respuesta.status_code == 400
        assert CourseMaterial.objects.count() == 0
