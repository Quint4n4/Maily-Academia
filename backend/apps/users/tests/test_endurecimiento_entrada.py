"""
Endurecimiento de entrada y respuestas — sesion 3 del plan de correcciones.

Tres puntos de `security-checklist`:

  · 14 · Ningun campo de texto es ilimitado
  · 18 · Los datos personales no se cachean en el navegador
  · 10 · El recurso ajeno no confirma su existencia

Ver docs/00-deuda.md, P1-3, P1-6 y P2-7.
"""
import pytest

pytestmark = pytest.mark.django_db

UN_MEGA = 'A' * (1024 * 1024)
TEXTO_LARGO_LEGITIMO = 'B' * 2000


@pytest.fixture
def instructor_con_academia(instructor, academia_con_vitrina, dar_membresia):
    from apps.sections.models import SectionMembership
    dar_membresia(instructor, academia_con_vitrina, SectionMembership.Role.INSTRUCTOR)
    return instructor


class TestLimiteDeTexto:
    def test_un_mega_de_texto_se_rechaza_con_400(self, api, instructor_con_academia):
        api.force_authenticate(instructor_con_academia)

        respuesta = api.post('/api/courses/', {
            'title': 'Curso', 'description': UN_MEGA,
            'level': 'beginner', 'price': 0, 'status': 'draft',
        }, format='json')

        # 400 y no 201 (se guardo) ni 500 (revento en la base).
        assert respuesta.status_code == 400, (
            f'se acepto 1 MB de texto: HTTP {respuesta.status_code}'
        )

    def test_un_titulo_de_un_mega_tambien_se_rechaza(self, api, instructor_con_academia):
        api.force_authenticate(instructor_con_academia)

        respuesta = api.post('/api/courses/', {
            'title': UN_MEGA, 'description': 'ok',
            'level': 'beginner', 'price': 0, 'status': 'draft',
        }, format='json')
        assert respuesta.status_code == 400

    def test_un_texto_largo_pero_razonable_se_sigue_guardando(
        self, api, instructor_con_academia
    ):
        """El limite no puede estorbar a una descripcion de verdad."""
        api.force_authenticate(instructor_con_academia)

        respuesta = api.post('/api/courses/', {
            'title': 'Curso con descripcion larga', 'description': TEXTO_LARGO_LEGITIMO,
            'level': 'beginner', 'price': 0, 'status': 'draft',
        }, format='json')

        assert respuesta.status_code == 201, respuesta.content
        assert len(respuesta.json()['description']) == 2000


class TestCacheDeDatosPersonales:
    def test_el_perfil_propio_no_se_cachea(self, api, alumno):
        api.force_authenticate(alumno)

        respuesta = api.get('/api/auth/me/')
        assert respuesta.status_code == 200

        cache_control = respuesta.headers.get('Cache-Control', '')
        assert 'no-store' in cache_control, (
            f'los datos personales se pueden cachear: Cache-Control={cache_control!r}'
        )

    def test_el_catalogo_publico_si_se_puede_cachear(self, api, academia_con_vitrina):
        """El endurecimiento no debe apagar la cache de lo que si es publico."""
        respuesta = api.get('/api/courses/')
        assert 'no-store' not in respuesta.headers.get('Cache-Control', '')


class TestRecursoAjeno:
    def test_un_certificado_ajeno_responde_404_y_no_403(
        self, api, alumno, instructor, academia_con_vitrina, curso_factory
    ):
        """
        Un 403 confirma que el certificado existe, y con eso se puede contar por
        enumeracion de ids cuantos se han emitido y a cuantas personas. Sobre un
        documento con el nombre completo de alguien, confirmar la existencia ya
        es informacion.
        """
        from apps.certificates.models import Certificate
        from apps.users.models import User

        curso = curso_factory(academia_con_vitrina)
        duenio = User.objects.create_user(
            email='duenio@ejemplo.com', username='duenio',
            password='Estudiante12345!', role='student',
        )
        certificado = Certificate.objects.create(user=duenio, course=curso)

        api.force_authenticate(alumno)
        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')

        assert respuesta.status_code == 404, (
            f'el certificado ajeno confirmo su existencia con HTTP {respuesta.status_code}'
        )

    def test_un_certificado_inexistente_responde_igual_que_uno_ajeno(
        self, api, alumno, instructor, academia_con_vitrina, curso_factory
    ):
        """Las dos respuestas deben ser indistinguibles."""
        from apps.certificates.models import Certificate
        from apps.users.models import User

        curso = curso_factory(academia_con_vitrina)
        duenio = User.objects.create_user(
            email='duenio2@ejemplo.com', username='duenio2',
            password='Estudiante12345!', role='student',
        )
        certificado = Certificate.objects.create(user=duenio, course=curso)

        api.force_authenticate(alumno)
        ajeno = api.get(f'/api/certificates/{certificado.id}/download/')
        inexistente = api.get('/api/certificates/999999/download/')

        assert ajeno.status_code == inexistente.status_code == 404

    def test_el_dueno_si_descarga_su_certificado(
        self, api, alumno, academia_con_vitrina, curso_factory
    ):
        from apps.certificates.models import Certificate

        curso = curso_factory(academia_con_vitrina)
        certificado = Certificate.objects.create(user=alumno, course=curso)

        api.force_authenticate(alumno)
        respuesta = api.get(f'/api/certificates/{certificado.id}/download/')
        assert respuesta.status_code == 200

    def test_el_detalle_de_usuario_responde_igual_exista_o_no(self, api, alumno):
        """
        `/api/users/{id}/` es solo para admin. Un 403 aqui es correcto --el rol no
        puede usar el endpoint-- siempre que sea el MISMO 403 exista el usuario o
        no. Si difiere, se puede enumerar quien existe.
        """
        api.force_authenticate(alumno)

        existente = api.get(f'/api/users/{alumno.id}/')
        inexistente = api.get('/api/users/999999/')

        assert existente.status_code == inexistente.status_code == 403
