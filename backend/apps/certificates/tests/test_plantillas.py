"""
Fase 1: el diploma como datos.

Tres cosas que se prueban aqui y que si fallan no se notan hasta tarde:

- El validador. Sin el, un documento roto se guarda y el error sale en la
  descarga del alumno, no en el editor.
- El aislamiento de plantillas. Es la misma clase de fuga que ya aparecio tres
  veces en este repo: el filtro esta en unas vistas y falta en las de al lado.
- Que la semilla sea valida contra su propio validador. Si no lo fuera, el
  editor cargaria una plantilla que el servidor rechaza al guardar.
"""

import copy

import pytest

from apps.certificates.documento import (
    DOCUMENTO_SEMILLA,
    documento_semilla,
    validar_documento,
)
from apps.certificates.models import PlantillaDeDiploma
from apps.sections.models import SectionMembership


@pytest.fixture
def instructor_de_vitrina(instructor, academia_con_vitrina, dar_membresia):
    dar_membresia(instructor, academia_con_vitrina, SectionMembership.Role.INSTRUCTOR)
    return instructor


@pytest.fixture
def otro_instructor(db, academia_cerrada, dar_membresia, django_user_model):
    usuario = django_user_model.objects.create_user(
        email='otroprofe@ejemplo.com', username='otroprofe',
        password='Profesor12345!', role='instructor',
    )
    dar_membresia(usuario, academia_cerrada, SectionMembership.Role.INSTRUCTOR)
    return usuario


# ---------------------------------------------------------------------------
# El validador
# ---------------------------------------------------------------------------


class TestElValidador:
    """Sin base de datos: `validar_documento` es una funcion pura."""

    def test_la_semilla_pasa_su_propio_validador(self):
        """
        Si la semilla no fuera valida, el editor cargaria de entrada una
        plantilla que el servidor rechaza al guardar, y el maestro no tendria
        forma de saber que no fue culpa suya.
        """
        assert validar_documento(documento_semilla()) == {}

    def test_un_tipo_inventado_se_rechaza(self):
        documento = documento_semilla()
        documento['elementos'].append({'id': 'x', 'tipo': 'video', 'x': 10, 'y': 10, 'ancho': 10})

        errores = validar_documento(documento)

        assert 'x' in errores['elementos']

    def test_una_fuente_fuera_del_catalogo_se_rechaza(self):
        """"Las fuentes de Canva" no existen en el servidor: el PDF saldria en
        Helvetica sin avisar, o reventaria."""
        documento = documento_semilla()
        documento['elementos'][0]['fuente'] = 'Great Vibes'

        errores = validar_documento(documento)

        assert 'marca' in errores['elementos']

    @pytest.mark.parametrize(
        'cambio, porque',
        [
            ({'x': -5}, 'se sale por la izquierda'),
            ({'y': -5}, 'se sale por arriba'),
            ({'x': 280, 'ancho': 50}, 'se sale por la derecha'),
            ({'ancho': 0}, 'ancho cero'),
            ({'tamano': 300}, 'tamano imposible'),
            ({'tamano': 1}, 'tamano ilegible'),
            ({'align': 'justificado'}, 'alineacion que no existe'),
            ({'color': 'rojo'}, 'color que no es #rrggbb'),
        ],
    )
    def test_los_valores_imposibles_se_rechazan(self, cambio, porque):
        documento = documento_semilla()
        documento['elementos'][0].update(cambio)

        errores = validar_documento(documento)

        assert 'marca' in errores.get('elementos', {}), porque

    def test_no_se_puede_borrar_el_codigo_de_verificacion(self):
        """
        Es lo que un editor libre borraria primero por estorbar, y sin el el
        diploma deja de poder comprobarse.
        """
        documento = documento_semilla()
        documento['elementos'] = [
            e for e in documento['elementos'] if e['id'] != 'codigo'
        ]

        errores = validar_documento(documento)

        assert any('codigo' in mensaje for mensaje in errores['documento'])

    def test_los_ids_repetidos_se_rechazan(self):
        documento = documento_semilla()
        documento['elementos'].append(copy.deepcopy(documento['elementos'][0]))

        errores = validar_documento(documento)

        assert any('repetido' in mensaje for mensaje in errores['documento'])

    def test_una_imagen_de_otro_no_se_puede_montar(self):
        """
        AMBITO>> El id de un recurso ajeno se rechaza aunque el documento sea
        perfecto por lo demas. Sin esto, basta con escribir el numero.
        """
        documento = documento_semilla()
        documento['elementos'].append({
            'id': 'marco-ajeno', 'tipo': 'imagen', 'recurso_id': 99,
            'x': 10, 'y': 10, 'ancho': 50, 'alto': 30,
        })

        errores = validar_documento(documento, recursos_permitidos={1, 2})

        assert 'marco-ajeno' in errores['elementos']

    def test_no_caben_mas_de_cuarenta_elementos(self):
        documento = documento_semilla()
        for numero in range(45):
            documento['elementos'].append({
                'id': f'relleno-{numero}', 'tipo': 'linea',
                'x': 10, 'y': 10, 'ancho': 10,
            })

        errores = validar_documento(documento)

        assert any('40' in mensaje for mensaje in errores['documento'])

    def test_los_errores_vienen_por_elemento(self):
        """El editor tiene que poder marcar en rojo cual de los cuarenta falla."""
        documento = documento_semilla()
        documento['elementos'][0]['tamano'] = 999
        documento['elementos'][1]['align'] = 'diagonal'

        errores = validar_documento(documento)

        assert set(errores['elementos']) == {'marca', 'titulo'}


# ---------------------------------------------------------------------------
# Aislamiento
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestQuienVeQuePlantilla:

    def test_el_maestro_ve_las_globales_y_las_suyas(self, api, instructor_de_vitrina):
        global_ = PlantillaDeDiploma.objects.create(
            nombre='De la plataforma', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.GLOBAL,
        )
        propia = PlantillaDeDiploma.objects.create(
            nombre='La mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.get('/api/diplomas/plantillas/')

        assert respuesta.status_code == 200
        vistos = {p['id'] for p in respuesta.data['results']}
        assert vistos == {global_.id, propia.id}

    def test_no_ve_la_plantilla_de_un_maestro_de_otra_academia(
        self, api, instructor_de_vitrina, otro_instructor,
    ):
        """AMBITO>> El maestro SI tiene academia propia y aun asi la ajena no existe."""
        ajena = PlantillaDeDiploma.objects.create(
            nombre='De otro', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=otro_instructor,
        )
        api.force_authenticate(instructor_de_vitrina)

        lista = api.get('/api/diplomas/plantillas/')
        detalle = api.get(f'/api/diplomas/plantillas/{ajena.id}/')

        assert ajena.id not in {p['id'] for p in lista.data['results']}
        assert detalle.status_code == 404

    def test_un_alumno_no_ve_ninguna(self, api, alumno):
        PlantillaDeDiploma.objects.create(
            nombre='De la plataforma', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(alumno)

        respuesta = api.get('/api/diplomas/plantillas/')

        assert respuesta.status_code == 403

    def test_el_maestro_no_puede_reescribir_la_global(self, api, instructor_de_vitrina):
        """
        La ve, para copiarla. No la edita: su cambio saldria en los diplomas de
        las tres academias.
        """
        global_ = PlantillaDeDiploma.objects.create(
            nombre='De la plataforma', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(instructor_de_vitrina)

        ve = api.get(f'/api/diplomas/plantillas/{global_.id}/')
        edita = api.patch(
            f'/api/diplomas/plantillas/{global_.id}/', {'nombre': 'Mía ahora'}, format='json',
        )

        assert ve.status_code == 200
        assert ve.data['puede_editarla'] is False
        assert edita.status_code == 404


# ---------------------------------------------------------------------------
# Crear, guardar y previsualizar
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestElEditor:

    def test_crear_sin_copiar_parte_de_la_semilla(self, api, instructor_de_vitrina):
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            '/api/diplomas/plantillas/', {'nombre': 'Mi diploma'}, format='json',
        )

        assert respuesta.status_code == 201
        assert respuesta.data['alcance'] == 'instructor'
        assert respuesta.data['owner'] == instructor_de_vitrina.id
        ids = {e['id'] for e in respuesta.data['documento']['elementos']}
        assert ids == {e['id'] for e in DOCUMENTO_SEMILLA['elementos']}

    def test_no_se_puede_crear_una_global_a_mano(self, api, instructor_de_vitrina):
        """
        `alcance` es de solo lectura. Si no lo fuera, un maestro se hace una
        plantilla global y su diseno sale en las tres academias.
        """
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            '/api/diplomas/plantillas/',
            {'nombre': 'Cuela', 'alcance': 'global'}, format='json',
        )

        assert respuesta.status_code == 201
        assert respuesta.data['alcance'] == 'instructor'

    def test_copiar_una_plantilla_ajena_da_404(
        self, api, instructor_de_vitrina, otro_instructor,
    ):
        ajena = PlantillaDeDiploma.objects.create(
            nombre='De otro', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=otro_instructor,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            '/api/diplomas/plantillas/',
            {'nombre': 'Robada', 'copiar_de': ajena.id}, format='json',
        )

        assert respuesta.status_code == 404

    def test_guardar_un_documento_roto_devuelve_400_y_no_lo_guarda(
        self, api, instructor_de_vitrina,
    ):
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        roto = documento_semilla()
        roto['elementos'][0]['tamano'] = 9999
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.patch(
            f'/api/diplomas/plantillas/{plantilla.id}/', {'documento': roto}, format='json',
        )

        assert respuesta.status_code == 400
        plantilla.refresh_from_db()
        assert plantilla.documento['elementos'][0]['tamano'] == 12

    def test_guardar_un_documento_bueno_lo_guarda(self, api, instructor_de_vitrina):
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        movido = documento_semilla()
        movido['elementos'][0]['y'] = 35
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.patch(
            f'/api/diplomas/plantillas/{plantilla.id}/', {'documento': movido}, format='json',
        )

        assert respuesta.status_code == 200
        plantilla.refresh_from_db()
        assert plantilla.documento['elementos'][0]['y'] == 35

    def test_la_vista_previa_devuelve_un_pdf_y_no_emite_nada(
        self, api, instructor_de_vitrina,
    ):
        from apps.certificates.models import Certificate

        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(f'/api/diplomas/plantillas/{plantilla.id}/preview/')

        assert respuesta.status_code == 200
        assert respuesta['Content-Type'] == 'application/pdf'
        assert b''.join(respuesta.streaming_content
                        if respuesta.streaming else [respuesta.content])[:4] == b'%PDF'
        assert Certificate.objects.count() == 0

    def test_la_vista_previa_acepta_cambios_sin_guardar(self, api, instructor_de_vitrina):
        """
        Es lo que permite ver el cambio antes de decidir. Si obligara a guardar,
        el maestro tendria que romper su plantilla buena para probar una idea.
        """
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        movido = documento_semilla()
        movido['elementos'][0]['y'] = 40
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            f'/api/diplomas/plantillas/{plantilla.id}/preview/',
            {'documento': movido}, format='json',
        )

        assert respuesta.status_code == 200
        plantilla.refresh_from_db()
        assert plantilla.documento['elementos'][0]['y'] == 21

    def test_la_vista_previa_rechaza_un_documento_roto(self, api, instructor_de_vitrina):
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        roto = documento_semilla()
        roto['elementos'][0]['x'] = -50
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            f'/api/diplomas/plantillas/{plantilla.id}/preview/',
            {'documento': roto}, format='json',
        )

        assert respuesta.status_code == 400
