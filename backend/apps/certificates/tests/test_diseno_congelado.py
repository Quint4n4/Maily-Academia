"""
Fase 4: lo emitido no se mueve, tampoco por dentro.

La fase 0 congelo los TEXTOS del diploma. Desde la fase 3 el maestro puede
rediseñar la plantilla de su curso, asi que faltaba congelar el DISENO: sin
eso, mover un elemento hoy reescribe el aspecto de todos los diplomas que sus
alumnos ya descargaron. Es el mismo fallo de la fase 0 un piso mas abajo.

Aqui tambien se comprueba la matriz de permisos del §8 del contrato, fila por
fila. Una matriz escrita en un documento y no ejercitada es una intencion.
"""

import pytest

from apps.certificates.documento import documento_semilla
from apps.certificates.models import Certificate, PlantillaDeDiploma, RecursoDeDiploma
from apps.certificates.services import (
    congelar_documento,
    documento_del_certificado,
    emitir_certificado,
    resolver_recurso,
)
from apps.sections.models import SectionMembership


@pytest.fixture
def instructor_de_vitrina(instructor, academia_con_vitrina, dar_membresia):
    dar_membresia(instructor, academia_con_vitrina, SectionMembership.Role.INSTRUCTOR)
    return instructor


@pytest.fixture
def administrador(db, django_user_model):
    return django_user_model.objects.create_user(
        email='jefa@ejemplo.com', username='jefa',
        password='Admin12345!', role='admin',
    )


def _plantilla_de(instructor, **cambios):
    documento = documento_semilla()
    documento['elementos'][0].update(cambios or {'contenido': 'ORIGINAL'})
    return PlantillaDeDiploma.objects.create(
        nombre='La del curso', documento=documento,
        alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
    )


def _curso_con_plantilla(curso_factory, academia, plantilla, instructor=None):
    curso = curso_factory(academia)
    curso.plantilla_de_diploma = plantilla
    campos = ['plantilla_de_diploma']
    if instructor is not None:
        curso.instructor = instructor
        campos.append('instructor')
    curso.save(update_fields=campos)
    return curso


# ---------------------------------------------------------------------------
# El diseño se congela
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestElDisenoSeCongela:

    def test_al_emitir_se_guarda_el_diseno(
        self, alumno, instructor, curso_factory, academia_con_vitrina,
    ):
        plantilla = _plantilla_de(instructor)
        curso = _curso_con_plantilla(curso_factory, academia_con_vitrina, plantilla)

        certificado = emitir_certificado(alumno, curso)

        assert certificado.documento_congelado is not None
        assert certificado.documento_congelado['elementos'][0]['contenido'] == 'ORIGINAL'

    def test_rediseñar_la_plantilla_no_toca_el_diploma_emitido(
        self, alumno, instructor, curso_factory, academia_con_vitrina,
    ):
        """
        El fallo que cierra esta fase: el maestro mueve un elemento y el
        diploma que su alumno descargo el mes pasado cambia de aspecto.
        """
        plantilla = _plantilla_de(instructor)
        curso = _curso_con_plantilla(curso_factory, academia_con_vitrina, plantilla)
        certificado = emitir_certificado(alumno, curso)

        nuevo = documento_semilla()
        nuevo['elementos'][0]['contenido'] = 'REDISEÑADO'
        nuevo['elementos'][0]['y'] = 150
        plantilla.documento = nuevo
        plantilla.save(update_fields=['documento'])
        certificado.refresh_from_db()

        documento = documento_del_certificado(certificado)
        assert documento['elementos'][0]['contenido'] == 'ORIGINAL'
        assert documento['elementos'][0]['y'] == 21

    def test_borrar_la_plantilla_no_deja_al_diploma_sin_diseno(
        self, alumno, instructor, curso_factory, academia_con_vitrina,
    ):
        """
        Por esto se guarda el documento entero y no una FK: si el diploma
        apuntara a la plantilla, borrarla lo dejaria sin aspecto.
        """
        plantilla = _plantilla_de(instructor)
        curso = _curso_con_plantilla(curso_factory, academia_con_vitrina, plantilla)
        certificado = emitir_certificado(alumno, curso)

        plantilla.delete()
        certificado.refresh_from_db()

        assert documento_del_certificado(certificado)['elementos'][0]['contenido'] == 'ORIGINAL'

    def test_un_curso_sin_plantilla_congela_la_semilla(
        self, alumno, curso_factory, academia_con_vitrina,
    ):
        curso = curso_factory(academia_con_vitrina)

        certificado = emitir_certificado(alumno, curso)

        assert certificado.documento_congelado is not None
        assert {e['id'] for e in certificado.documento_congelado['elementos']} == {
            e['id'] for e in documento_semilla()['elementos']
        }

    def test_el_pdf_sale_con_el_diseno_congelado(
        self, api, alumno, instructor, curso_factory, academia_con_vitrina,
    ):
        plantilla = _plantilla_de(instructor)
        curso = _curso_con_plantilla(curso_factory, academia_con_vitrina, plantilla)
        certificado = emitir_certificado(alumno, curso)
        plantilla.delete()
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')

        assert respuesta.status_code == 200
        assert respuesta.content[:4] == b'%PDF'


# ---------------------------------------------------------------------------
# Las imágenes también
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLasImagenesTambienSeCongelan:

    def test_al_congelar_se_copia_el_identificador_de_cloudinary(self, instructor):
        recurso = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='Mi marco', cloudinary_public_id='diplomas/marco/abc',
            alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
        )
        documento = documento_semilla()
        documento['fondo'] = {'recurso_id': recurso.id}
        documento['elementos'].append({
            'id': 'logo', 'tipo': 'imagen', 'recurso_id': recurso.id,
            'x': 10, 'y': 10, 'ancho': 30, 'alto': 20,
        })

        congelado = congelar_documento(documento)

        assert congelado['fondo']['recurso_public_id'] == 'diplomas/marco/abc'
        logo = next(e for e in congelado['elementos'] if e['id'] == 'logo')
        assert logo['recurso_public_id'] == 'diplomas/marco/abc'

    def test_borrar_el_marco_de_la_galeria_no_deja_sin_fondo_lo_emitido(
        self, instructor, monkeypatch,
    ):
        """
        Sin el identificador congelado, el diploma emitido buscaria una fila que
        ya no existe y saldria sin marco.
        """
        pedidos = []
        monkeypatch.setattr(
            'apps.certificates.almacenamiento.ruta_local_de',
            lambda public_id: pedidos.append(public_id) or '/tmp/falso.png',
        )
        recurso = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='Mi marco', cloudinary_public_id='diplomas/marco/abc',
            alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
        )
        elemento = congelar_documento({
            'elementos': [{'id': 'logo', 'tipo': 'imagen', 'recurso_id': recurso.id}],
        })['elementos'][0]
        recurso.delete()

        ruta = resolver_recurso(elemento)

        assert ruta == '/tmp/falso.png'
        assert pedidos == ['diplomas/marco/abc']

    def test_sin_congelar_depende_de_la_fila_y_se_pierde(self, instructor, monkeypatch):
        """
        La otra cara: deja escrito que sin `recurso_public_id` el marco se
        pierde, para quien piense en quitar ese campo.
        """
        monkeypatch.setattr(
            'apps.certificates.almacenamiento.ruta_local_de', lambda public_id: '/tmp/falso.png',
        )
        recurso = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='Mi marco', cloudinary_public_id='diplomas/marco/abc',
            alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
        )
        elemento = {'id': 'logo', 'tipo': 'imagen', 'recurso_id': recurso.id}
        recurso.delete()

        assert resolver_recurso(elemento) is None


# ---------------------------------------------------------------------------
# La matriz de permisos del §8, fila por fila
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLaMatrizDePermisos:

    def test_el_administrador_si_edita_la_plantilla_de_la_plataforma(
        self, api, administrador,
    ):
        global_ = PlantillaDeDiploma.objects.create(
            nombre='De la plataforma', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(administrador)

        respuesta = api.patch(
            f'/api/diplomas/plantillas/{global_.id}/', {'nombre': 'Renombrada'}, format='json',
        )

        assert respuesta.status_code == 200
        assert respuesta.data['puede_editarla'] is True

    def test_el_administrador_si_publica_en_la_galeria_de_la_plataforma(
        self, api, administrador, monkeypatch,
    ):
        import io

        from PIL import Image

        monkeypatch.setattr(
            'apps.certificates.views_plantillas.subir_imagen',
            lambda archivo, *, tipo, dueno_id: 'diplomas/marco/oficial',
        )
        buffer = io.BytesIO()
        Image.new('RGB', (600, 400), (10, 20, 30)).save(buffer, format='PNG')
        buffer.seek(0)
        buffer.name = 'oficial.png'
        api.force_authenticate(administrador)

        respuesta = api.post(
            '/api/diplomas/recursos/',
            {'archivo': buffer, 'tipo': 'marco', 'nombre': 'Oficial', 'alcance': 'global'},
            format='multipart',
        )

        assert respuesta.status_code == 201
        assert respuesta.data['alcance'] == 'global'
        assert respuesta.data['owner'] is None

    def test_el_alumno_no_entra_a_ninguna_puerta(self, api, alumno):
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='De la plataforma', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(alumno)

        assert api.get('/api/diplomas/plantillas/').status_code == 403
        assert api.get('/api/diplomas/recursos/').status_code == 403
        assert api.post('/api/diplomas/plantillas/', {'nombre': 'X'}, format='json').status_code == 403
        assert api.post(f'/api/diplomas/plantillas/{plantilla.id}/preview/').status_code == 403

    def test_sin_iniciar_sesion_tampoco(self, api):
        assert api.get('/api/diplomas/plantillas/').status_code in (401, 403)
        assert api.get('/api/diplomas/recursos/').status_code in (401, 403)

    def test_el_instructor_previsualiza_lo_que_puede_ver(self, api, instructor_de_vitrina):
        global_ = PlantillaDeDiploma.objects.create(
            nombre='De la plataforma', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(f'/api/diplomas/plantillas/{global_.id}/preview/')

        assert respuesta.status_code == 200

    def test_el_instructor_no_borra_la_plantilla_de_la_plataforma(
        self, api, instructor_de_vitrina,
    ):
        global_ = PlantillaDeDiploma.objects.create(
            nombre='De la plataforma', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.delete(f'/api/diplomas/plantillas/{global_.id}/')

        assert respuesta.status_code == 404
        assert PlantillaDeDiploma.objects.filter(pk=global_.id).exists()

    def test_el_instructor_si_borra_la_suya(self, api, instructor_de_vitrina):
        propia = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.delete(f'/api/diplomas/plantillas/{propia.id}/')

        assert respuesta.status_code == 204
        assert not PlantillaDeDiploma.objects.filter(pk=propia.id).exists()

    def test_borrar_una_plantilla_no_borra_los_diplomas_que_produjo(
        self, api, alumno, instructor_de_vitrina, curso_factory, academia_con_vitrina,
    ):
        """
        `Course.plantilla_de_diploma` es SET_NULL y el diploma lleva su copia:
        borrar el diseño no puede llevarse por delante certificados emitidos.
        """
        plantilla = _plantilla_de(instructor_de_vitrina)
        curso = _curso_con_plantilla(
            curso_factory, academia_con_vitrina, plantilla, instructor_de_vitrina,
        )
        certificado = emitir_certificado(alumno, curso)
        api.force_authenticate(instructor_de_vitrina)

        api.delete(f'/api/diplomas/plantillas/{plantilla.id}/')

        assert Certificate.objects.filter(pk=certificado.id).exists()
        curso.refresh_from_db()
        assert curso.plantilla_de_diploma_id is None
