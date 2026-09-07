"""
Fixtures compartidas por los tests del backend.

Las academias de este proyecto se llaman "secciones" en el codigo (`Section`), y
el ambito de aislamiento es la academia: ver `aislamiento.ambito: sede` en
`.claude/PERFIL-DEL-REPO.md`.
"""
import pytest
from rest_framework.test import APIClient

from apps.sections.models import Section, SectionMembership
from apps.courses.models import Course, Module, Lesson
from apps.users.models import User


@pytest.fixture
def api():
    return APIClient()


# `apps/sections/apps.py` engancha un post_migrate que crea las tres academias
# reales, asi que en la base de test ya existen. Los fixtures usan
# update_or_create para convivir con eso, y slugs propios donde el nombre no
# importa, para no depender de datos que otro cambie.
@pytest.fixture
def academia_con_vitrina(db):
    """Academia publica cuyo catalogo se muestra sin iniciar sesion."""
    seccion, _ = Section.objects.update_or_create(
        slug='academia-con-vitrina',
        defaults=dict(
            name='Academia con vitrina',
            section_type=Section.SectionType.PUBLIC,
            require_credentials=False, allow_public_preview=True, is_active=True,
        ),
    )
    return seccion


@pytest.fixture
def academia_cerrada(db):
    """Academia interna: ni su catalogo ni su contenido salen al publico."""
    seccion, _ = Section.objects.update_or_create(
        slug='academia-cerrada',
        defaults=dict(
            name='Academia cerrada',
            section_type=Section.SectionType.CORPORATE,
            require_credentials=True, allow_public_preview=False, is_active=True,
        ),
    )
    return seccion


@pytest.fixture(autouse=True)
def _academias_reales_sin_vitrina(db):
    """
    Las academias que crea el post_migrate no deben contaminar los tests del
    catalogo publico: se les quita la vitrina salvo que un test la pida.
    """
    Section.objects.exclude(slug__startswith='academia-').update(
        allow_public_preview=False,
    )


@pytest.fixture
def instructor(db):
    return User.objects.create_user(
        email='profe@ejemplo.com', username='profe',
        password='Profesor12345!', role='instructor',
    )


@pytest.fixture
def alumno(db):
    return User.objects.create_user(
        email='alumno@ejemplo.com', username='alumno',
        password='Estudiante12345!', role='student',
    )


@pytest.fixture
def curso_factory(instructor):
    """Crea un curso publicado, con un modulo y una leccion con video."""
    def crear(section, titulo='Curso de prueba', status='published'):
        curso = Course.objects.create(
            title=titulo, description='descripcion', instructor=instructor,
            section=section, status=status, level='beginner',
        )
        modulo = Module.objects.create(course=curso, title='Modulo 1', order=1)
        Lesson.objects.create(
            module=modulo, title='Leccion 1', order=1,
            video_url='https://www.youtube.com/embed/SECRETO123',
        )
        return curso
    return crear


@pytest.fixture
def dar_membresia(db):
    def asignar(user, section, role=SectionMembership.Role.STUDENT):
        return SectionMembership.objects.create(
            user=user, section=section, role=role, is_active=True,
        )
    return asignar
