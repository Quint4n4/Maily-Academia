"""
Fase 2: la galeria de marcos, logos y sellos.

**Nada de aqui habla con Cloudinary.** El `CLAUDE.md` del repo avisa de que el
`.env` local trae credenciales reales y de que hay que comprobar si son la misma
cuenta que produccion antes de subir desde una maquina de desarrollo. La subida
se sustituye por un doble; lo que SI se ejercita de verdad es la validacion de
la imagen, que es la parte que decide si un archivo entra o no.
"""

import io

import pytest
from PIL import Image

from apps.certificates import almacenamiento
from apps.certificates.almacenamiento import ErrorDeImagen, validar_imagen
from apps.certificates.documento import documento_semilla, validar_documento
from apps.certificates.models import PlantillaDeDiploma, RecursoDeDiploma
from apps.sections.models import SectionMembership


def imagen_de_prueba(formato='PNG', tamano=(800, 600)) -> io.BytesIO:
    buffer = io.BytesIO()
    Image.new('RGB', tamano, (200, 160, 40)).save(buffer, format=formato)
    buffer.seek(0)
    buffer.name = f'marco.{formato.lower()}'
    buffer.size = buffer.getbuffer().nbytes
    return buffer


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


@pytest.fixture
def sin_cloudinary(monkeypatch):
    """Doble de la subida: devuelve un identificador y no sale a la red."""
    subidas = []

    def falsa_subida(archivo, *, tipo, dueno_id):
        subidas.append({'tipo': tipo, 'dueno_id': dueno_id})
        return f'diplomas/{tipo}/falso_{len(subidas)}'

    monkeypatch.setattr(
        'apps.certificates.views_plantillas.subir_imagen', falsa_subida,
    )
    monkeypatch.setattr(
        'apps.certificates.views_plantillas.borrar_imagen', lambda public_id: None,
    )
    monkeypatch.setattr(
        'apps.certificates.serializers.RecursoDeDiplomaSerializer.get_url',
        lambda self, obj: f'https://ejemplo.test/{obj.cloudinary_public_id}.png',
    )
    return subidas


# ---------------------------------------------------------------------------
# Validacion de la imagen
# ---------------------------------------------------------------------------


class TestQueEntraYQueNo:
    """Esto SI se ejercita de verdad: es la puerta por donde llega un archivo
    de fuera."""

    @pytest.mark.parametrize('formato', ['PNG', 'JPEG', 'WEBP'])
    def test_los_formatos_admitidos_pasan(self, formato):
        ancho, alto = validar_imagen(imagen_de_prueba(formato))

        assert (ancho, alto) == (800, 600)

    def test_un_svg_no_pasa_aunque_se_llame_png(self):
        """
        Un SVG admite `<script>` dentro: seria XSS el dia que el editor lo
        muestre en linea. Y llamarlo .png no lo convierte en PNG, que es justo
        por lo que no se mira la extension.
        """
        svg = io.BytesIO(
            b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        )
        svg.name = 'marco.png'
        svg.size = svg.getbuffer().nbytes

        with pytest.raises(ErrorDeImagen):
            validar_imagen(svg)

    def test_un_archivo_que_no_es_imagen_no_pasa(self):
        falso = io.BytesIO(b'no soy una imagen, soy un PDF disfrazado')
        falso.name = 'marco.png'
        falso.size = falso.getbuffer().nbytes

        with pytest.raises(ErrorDeImagen, match='no es una imagen'):
            validar_imagen(falso)

    def test_una_imagen_truncada_no_pasa(self):
        """Si pasara, reventaria al dibujar el PDF y no al subirla."""
        entera = imagen_de_prueba().getvalue()
        rota = io.BytesIO(entera[: len(entera) // 2])
        rota.name = 'marco.png'
        rota.size = rota.getbuffer().nbytes

        with pytest.raises(ErrorDeImagen):
            validar_imagen(rota)

    def test_una_imagen_demasiado_pesada_no_pasa(self, monkeypatch):
        monkeypatch.setattr(almacenamiento, 'PESO_MAXIMO', 100)

        with pytest.raises(ErrorDeImagen, match='MB'):
            validar_imagen(imagen_de_prueba())

    def test_una_bomba_de_descompresion_no_pasa(self, monkeypatch):
        """
        El limite de peso NO basta: un PNG de pocos MB puede descomprimirse a
        decenas de miles de pixeles por lado y tumbar el worker.
        """
        monkeypatch.setattr(almacenamiento, 'PIXELES_MAXIMOS', 1000)

        with pytest.raises(ErrorDeImagen, match='píxeles'):
            validar_imagen(imagen_de_prueba(tamano=(500, 500)))


# ---------------------------------------------------------------------------
# La galeria
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLaGaleria:

    def test_subir_un_marco_lo_deja_listo_para_usar(
        self, api, instructor_de_vitrina, sin_cloudinary,
    ):
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            '/api/diplomas/recursos/',
            {'archivo': imagen_de_prueba(), 'tipo': 'marco', 'nombre': 'Marco dorado'},
            format='multipart',
        )

        assert respuesta.status_code == 201
        assert respuesta.data['ancho_px'] == 800
        assert respuesta.data['alto_px'] == 600
        assert respuesta.data['alcance'] == 'instructor'
        assert respuesta.data['owner'] == instructor_de_vitrina.id

    def test_un_maestro_no_puede_publicar_en_la_galeria_de_la_plataforma(
        self, api, instructor_de_vitrina, sin_cloudinary,
    ):
        """Si pudiera, llenaria la galeria que ven las tres academias."""
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            '/api/diplomas/recursos/',
            {'archivo': imagen_de_prueba(), 'tipo': 'marco',
             'nombre': 'Cuela', 'alcance': 'global'},
            format='multipart',
        )

        assert respuesta.status_code == 201
        assert respuesta.data['alcance'] == 'instructor'

    def test_una_imagen_rechazada_no_llega_a_cloudinary(
        self, api, instructor_de_vitrina, sin_cloudinary,
    ):
        """
        Subir primero y preguntar despues gasta cuota con basura y deja
        imagenes huerfanas alla cuando la fila no se crea.
        """
        falso = io.BytesIO(b'esto no es una imagen')
        falso.name = 'marco.png'
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            '/api/diplomas/recursos/',
            {'archivo': falso, 'tipo': 'marco'},
            format='multipart',
        )

        assert respuesta.status_code == 400
        assert sin_cloudinary == []
        assert RecursoDeDiploma.objects.count() == 0

    def test_un_tipo_que_no_existe_se_rechaza(
        self, api, instructor_de_vitrina, sin_cloudinary,
    ):
        """`firma` no es un tipo admitido: ver el docstring de RecursoDeDiploma."""
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.post(
            '/api/diplomas/recursos/',
            {'archivo': imagen_de_prueba(), 'tipo': 'firma'},
            format='multipart',
        )

        assert respuesta.status_code == 400
        assert sin_cloudinary == []

    def test_no_ve_los_recursos_de_otra_academia(
        self, api, instructor_de_vitrina, otro_instructor, sin_cloudinary,
    ):
        """AMBITO>> Tiene academia propia y aun asi el marco ajeno no existe."""
        ajeno = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='De otro', cloudinary_public_id='x/1',
            alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=otro_instructor,
        )
        global_ = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='De la plataforma', cloudinary_public_id='x/2',
            alcance=RecursoDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.get('/api/diplomas/recursos/')

        vistos = {r['id'] for r in respuesta.data['results']}
        assert global_.id in vistos
        assert ajeno.id not in vistos

    def test_no_puede_borrar_el_recurso_de_la_plataforma(
        self, api, instructor_de_vitrina, sin_cloudinary,
    ):
        global_ = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='De la plataforma', cloudinary_public_id='x/2',
            alcance=RecursoDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.delete(f'/api/diplomas/recursos/{global_.id}/')

        assert respuesta.status_code == 404
        assert RecursoDeDiploma.objects.filter(pk=global_.id).exists()

    def test_el_filtro_por_tipo_funciona(
        self, api, instructor_de_vitrina, sin_cloudinary,
    ):
        RecursoDeDiploma.objects.create(
            tipo='marco', nombre='Un marco', cloudinary_public_id='x/1',
            alcance=RecursoDeDiploma.Alcance.GLOBAL,
        )
        RecursoDeDiploma.objects.create(
            tipo='logo', nombre='Un logo', cloudinary_public_id='x/2',
            alcance=RecursoDeDiploma.Alcance.GLOBAL,
        )
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.get('/api/diplomas/recursos/?tipo=logo')

        assert [r['nombre'] for r in respuesta.data['results']] == ['Un logo']


# ---------------------------------------------------------------------------
# El agujero que la fase 1 dejo abierto a proposito
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestElDocumentoSoloMontaLoSuyo:

    def test_un_marco_propio_se_puede_montar(
        self, api, instructor_de_vitrina, sin_cloudinary,
    ):
        recurso = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='Mío', cloudinary_public_id='x/1',
            alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        documento = documento_semilla()
        documento['elementos'].append({
            'id': 'logo', 'tipo': 'imagen', 'recurso_id': recurso.id,
            'x': 20, 'y': 20, 'ancho': 40, 'alto': 25,
        })
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.patch(
            f'/api/diplomas/plantillas/{plantilla.id}/',
            {'documento': documento}, format='json',
        )

        assert respuesta.status_code == 200

    def test_el_marco_de_otra_academia_se_rechaza(
        self, api, instructor_de_vitrina, otro_instructor, sin_cloudinary,
    ):
        """
        AMBITO>> Este es el agujero que la fase 1 dejo cerrado con un conjunto
        vacio y que ahora se cierra con el conjunto real: basta con escribir el
        id ajeno en el documento.
        """
        ajeno = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='De otro', cloudinary_public_id='x/9',
            alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=otro_instructor,
        )
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        documento = documento_semilla()
        documento['elementos'].append({
            'id': 'robado', 'tipo': 'imagen', 'recurso_id': ajeno.id,
            'x': 20, 'y': 20, 'ancho': 40, 'alto': 25,
        })
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.patch(
            f'/api/diplomas/plantillas/{plantilla.id}/',
            {'documento': documento}, format='json',
        )

        assert respuesta.status_code == 400
        assert 'robado' in respuesta.data['documento']['elementos']

    def test_el_validador_con_none_sigue_saltandose_la_comprobacion(self):
        """
        Documenta por que `recursos_permitidos` NUNCA debe quedarse en None en
        una ruta que recibe datos de un usuario. Si alguien lo cambia "para que
        funcione", este test explica lo que se pierde.
        """
        documento = documento_semilla()
        documento['elementos'].append({
            'id': 'cualquiera', 'tipo': 'imagen', 'recurso_id': 999999,
            'x': 20, 'y': 20, 'ancho': 40, 'alto': 25,
        })

        assert validar_documento(documento, recursos_permitidos=None) == {}
        assert 'cualquiera' in validar_documento(
            documento, recursos_permitidos=set(),
        )['elementos']


# ---------------------------------------------------------------------------
# El diploma usa la plantilla del curso
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestElCursoElijeSuDiseno:

    def test_sin_plantilla_el_diploma_sale_con_la_semilla(
        self, api, alumno, curso_factory, academia_con_vitrina,
    ):
        from apps.certificates.services import documento_del_certificado, emitir_certificado

        curso = curso_factory(academia_con_vitrina)
        certificado = emitir_certificado(alumno, curso)

        documento = documento_del_certificado(certificado)

        assert {e['id'] for e in documento['elementos']} == {
            e['id'] for e in documento_semilla()['elementos']
        }

    def test_con_plantilla_el_diploma_usa_la_del_curso(
        self, api, alumno, instructor, curso_factory, academia_con_vitrina,
    ):
        from apps.certificates.services import documento_del_certificado, emitir_certificado

        propio = documento_semilla()
        propio['elementos'][0]['contenido'] = 'MI ACADEMIA'
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='La del curso', documento=propio,
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
        )
        curso = curso_factory(academia_con_vitrina)
        curso.plantilla_de_diploma = plantilla
        curso.save(update_fields=['plantilla_de_diploma'])
        certificado = emitir_certificado(alumno, curso)

        documento = documento_del_certificado(certificado)

        assert documento['elementos'][0]['contenido'] == 'MI ACADEMIA'

    def test_la_descarga_sigue_dando_un_pdf_con_plantilla_propia(
        self, api, alumno, instructor, curso_factory, academia_con_vitrina,
    ):
        from apps.certificates.services import emitir_certificado

        plantilla = PlantillaDeDiploma.objects.create(
            nombre='La del curso', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
        )
        curso = curso_factory(academia_con_vitrina)
        curso.plantilla_de_diploma = plantilla
        curso.save(update_fields=['plantilla_de_diploma'])
        certificado = emitir_certificado(alumno, curso)
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')

        assert respuesta.status_code == 200
        assert respuesta.content[:4] == b'%PDF'

    def test_si_la_imagen_no_se_puede_traer_el_diploma_sale_igual(
        self, api, alumno, instructor, curso_factory, academia_con_vitrina, monkeypatch,
    ):
        """
        Cloudinary caido no puede dejar a un alumno sin su diploma. El elemento
        no se dibuja y el resto del documento sale.
        """
        from apps.certificates.services import emitir_certificado

        monkeypatch.setattr(
            'apps.certificates.almacenamiento.ruta_local_de', lambda public_id: None,
        )
        recurso = RecursoDeDiploma.objects.create(
            tipo='marco', nombre='Inalcanzable', cloudinary_public_id='x/1',
            alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
        )
        documento = documento_semilla()
        documento['fondo'] = {'recurso_id': recurso.id}
        plantilla = PlantillaDeDiploma.objects.create(
            nombre='Con marco', documento=documento,
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor,
        )
        curso = curso_factory(academia_con_vitrina)
        curso.plantilla_de_diploma = plantilla
        curso.save(update_fields=['plantilla_de_diploma'])
        certificado = emitir_certificado(alumno, curso)
        api.force_authenticate(alumno)

        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')

        assert respuesta.status_code == 200
        assert respuesta.content[:4] == b'%PDF'

    def test_no_puede_asignar_a_su_curso_una_plantilla_ajena(
        self, api, instructor_de_vitrina, otro_instructor, curso_factory,
        academia_con_vitrina,
    ):
        """
        AMBITO>> El queryset del campo es la validacion. Sin acotarlo, el
        maestro manda el id de la plantilla de otra academia y el diploma de
        sus alumnos sale con el diseno ajeno.
        """
        ajena = PlantillaDeDiploma.objects.create(
            nombre='De otro', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=otro_instructor,
        )
        curso = curso_factory(academia_con_vitrina)
        curso.instructor = instructor_de_vitrina
        curso.save(update_fields=['instructor'])
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.patch(
            f'/api/courses/{curso.id}/',
            {'plantilla_de_diploma_id': ajena.id}, format='json',
        )

        assert respuesta.status_code == 400
        curso.refresh_from_db()
        assert curso.plantilla_de_diploma_id is None

    def test_si_puede_asignar_una_propia(
        self, api, instructor_de_vitrina, curso_factory, academia_con_vitrina,
    ):
        propia = PlantillaDeDiploma.objects.create(
            nombre='Mía', documento=documento_semilla(),
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=instructor_de_vitrina,
        )
        curso = curso_factory(academia_con_vitrina)
        curso.instructor = instructor_de_vitrina
        curso.save(update_fields=['instructor'])
        api.force_authenticate(instructor_de_vitrina)

        respuesta = api.patch(
            f'/api/courses/{curso.id}/',
            {'plantilla_de_diploma_id': propia.id}, format='json',
        )

        assert respuesta.status_code == 200
        curso.refresh_from_db()
        assert curso.plantilla_de_diploma_id == propia.id
