"""
Bitacora de auditoria y monitoreo de errores — sesion 4 del plan.

Puntos 24 y 26 de `security-checklist`:

  · 24 · El monitoreo de errores no repite el dato sensible
  · 26 · Queda registro de quien vio o cambio que

Ver docs/00-deuda.md, P1-2 y P1-4.
"""
import pytest

from config.observabilidad import antes_de_enviar, _limpiar

pytestmark = pytest.mark.django_db


class TestBitacora:
    def test_una_accion_sensible_deja_registro_con_actor_y_recurso(
        self, api, instructor, academia_con_vitrina, dar_membresia, curso_factory
    ):
        from apps.sections.models import SectionMembership
        from apps.users.models import RegistroDeAuditoria

        dar_membresia(instructor, academia_con_vitrina, SectionMembership.Role.INSTRUCTOR)
        curso = curso_factory(academia_con_vitrina, status='draft')
        api.force_authenticate(instructor)

        RegistroDeAuditoria.objects.all().delete()
        respuesta = api.patch(
            f'/api/courses/{curso.id}/', {'title': 'Titulo nuevo'}, format='json'
        )
        assert respuesta.status_code == 200, respuesta.content

        registro = RegistroDeAuditoria.objects.first()
        assert registro is not None, 'la accion no quedo registrada'
        assert registro.actor_id == instructor.id
        assert registro.actor_email == instructor.email
        assert registro.accion == 'actualizar'
        assert registro.recurso == '/api/courses/'
        assert registro.recurso_id == str(curso.id)
        assert registro.codigo_respuesta == 200

    def test_la_bitacora_se_puede_consultar_por_actor(
        self, api, instructor, academia_con_vitrina, dar_membresia, curso_factory
    ):
        """Es lo que la vuelve un requisito cumplido: 'que hizo esta persona'."""
        from apps.sections.models import SectionMembership
        from apps.users.models import RegistroDeAuditoria

        dar_membresia(instructor, academia_con_vitrina, SectionMembership.Role.INSTRUCTOR)
        curso = curso_factory(academia_con_vitrina, status='draft')
        api.force_authenticate(instructor)
        api.patch(f'/api/courses/{curso.id}/', {'title': 'A'}, format='json')
        api.patch(f'/api/courses/{curso.id}/', {'title': 'B'}, format='json')

        del_instructor = RegistroDeAuditoria.objects.filter(actor=instructor)
        assert del_instructor.count() >= 2

    def test_la_bitacora_se_puede_consultar_por_recurso(
        self, api, instructor, academia_con_vitrina, dar_membresia, curso_factory
    ):
        """Y la otra pregunta: 'quien toco este curso'."""
        from apps.sections.models import SectionMembership
        from apps.users.models import RegistroDeAuditoria

        dar_membresia(instructor, academia_con_vitrina, SectionMembership.Role.INSTRUCTOR)
        curso = curso_factory(academia_con_vitrina, status='draft')
        api.force_authenticate(instructor)
        api.patch(f'/api/courses/{curso.id}/', {'title': 'C'}, format='json')

        del_curso = RegistroDeAuditoria.objects.filter(
            recurso='/api/courses/', recurso_id=str(curso.id)
        )
        assert del_curso.exists()
        assert del_curso.first().actor_email == instructor.email

    def test_el_registro_sobrevive_al_borrado_del_usuario(
        self, api, instructor, academia_con_vitrina, dar_membresia, curso_factory
    ):
        """Una bitacora que pierde al actor cuando se va el empleado no sirve."""
        from apps.sections.models import SectionMembership
        from apps.users.models import RegistroDeAuditoria

        dar_membresia(instructor, academia_con_vitrina, SectionMembership.Role.INSTRUCTOR)
        curso = curso_factory(academia_con_vitrina, status='draft')
        api.force_authenticate(instructor)
        api.patch(f'/api/courses/{curso.id}/', {'title': 'D'}, format='json')

        correo = instructor.email
        instructor.delete()

        registro = RegistroDeAuditoria.objects.filter(actor_email=correo).first()
        assert registro is not None, 'el registro desaparecio con el usuario'
        assert registro.actor is None
        assert registro.actor_email == correo

    def test_una_lectura_no_ensucia_la_bitacora(
        self, api, alumno, academia_con_vitrina, curso_factory
    ):
        from apps.users.models import RegistroDeAuditoria

        curso = curso_factory(academia_con_vitrina)
        api.force_authenticate(alumno)
        RegistroDeAuditoria.objects.all().delete()

        api.get(f'/api/courses/{curso.id}/')
        assert RegistroDeAuditoria.objects.count() == 0


class TestMonitoreoSinDatosPersonales:
    def test_la_contrasena_no_sale_del_servidor(self):
        evento = {'request': {'data': {'email': 'a@b.com', 'password': 'Secreta123!'}}}
        limpio = antes_de_enviar(evento, {})
        assert limpio['request']['data']['password'] == '[oculto]'
        assert limpio['request']['data']['email'] == '[oculto]'

    def test_los_tokens_de_las_cabeceras_no_salen(self):
        evento = {'request': {'headers': {'Authorization': 'Bearer abc.def.ghi'}}}
        limpio = antes_de_enviar(evento, {})
        assert limpio['request']['headers']['Authorization'] == '[oculto]'

    def test_del_usuario_solo_viaja_el_id(self):
        evento = {'user': {'id': 7, 'email': 'a@b.com', 'ip_address': '1.2.3.4'}}
        limpio = antes_de_enviar(evento, {})
        assert limpio['user'] == {'id': 7}

    def test_las_variables_locales_de_la_traza_tambien_se_limpian(self):
        """Es la fuga menos obvia: el password vive en una variable local."""
        evento = {'exception': {'values': [{'stacktrace': {'frames': [
            {'vars': {'password': 'Secreta123!', 'course_id': 34}}
        ]}}]}}
        limpio = antes_de_enviar(evento, {})
        variables = limpio['exception']['values'][0]['stacktrace']['frames'][0]['vars']
        assert variables['password'] == '[oculto]'
        assert variables['course_id'] == 34, 'se borro un dato que si sirve para depurar'

    def test_las_cookies_no_se_envian(self):
        evento = {'request': {'cookies': {'sessionid': 'abc'}, 'data': {}}}
        limpio = antes_de_enviar(evento, {})
        assert 'cookies' not in limpio['request']

    def test_lo_anidado_tambien_se_limpia(self):
        sucio = {'usuario': {'perfil': {'telefono': '744...', 'ciudad': 'Acapulco'}}}
        limpio = _limpiar(sucio)
        assert limpio['usuario']['perfil']['telefono'] == '[oculto]'
        assert limpio['usuario']['perfil']['ciudad'] == 'Acapulco'
