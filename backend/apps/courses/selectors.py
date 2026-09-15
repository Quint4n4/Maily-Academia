"""
Selectores de cursos: la puerta unica por la que se lee un curso.

`aislamiento-de-datos` lo dice sin rodeos:

    Toda lectura de un objeto por id pasa por un selector. Un
    Model.objects.get(id=...) directo en la vista es la forma canonica de
    saltarse el filtro. Un repo con capa_de_servicios: ninguna filtra mal por
    diseno, no por descuido.

Aqui esta la prueba: el P0 del 2026-09-02 cerro la LECTURA del catalogo, y aun
asi `EnrollView` seguia haciendo `Course.objects.get(pk=course_id)` a pelo. Un
alumno de una academia podia INSCRIBIRSE en un curso de otra con solo saber el
id, y un id inexistente devolvia 500. El filtro estaba puesto en un sitio y
faltaba en el de al lado, que es lo que pasa cuando cada vista decide sola.

Mientras la regla de ambito viva repetida vista por vista, va a volver a faltar
en alguna. Este modulo existe para que haya un solo lugar donde mirarla.

Ver docs/00-deuda.md y `.claude/PERFIL-DEL-REPO.md`, seccion 2.
"""
from django.db.models import Count, Q
from django.http import Http404
from django.utils import timezone

from apps.sections.models import Section, SectionMembership

from .models import Course, Lesson


def secciones_visibles_para(user):
    """
    AMBITO>> Academias cuyo catalogo puede ver este usuario.

    - Anonimo: solo las que tienen vitrina publica (`allow_public_preview`).
    - Autenticado: las de vitrina, las de tipo `public` --excepcion E1 del
      PERFIL-DEL-REPO, declarada a proposito-- y aquellas donde tiene una
      membresia activa y no expirada.
    - Admin: todas.

    El ambito NUNCA viene del cliente: sale de la tabla de membresias
    (`aislamiento.origen: tabla-de-membresias`).
    """
    activas = Section.objects.filter(is_active=True)

    if not user or not user.is_authenticated:
        return activas.filter(allow_public_preview=True)

    if getattr(user, 'role', None) == 'admin' or user.is_superuser:
        return activas

    return activas.filter(
        Q(allow_public_preview=True)
        | Q(section_type=Section.SectionType.PUBLIC)
        | Q(id__in=_secciones_con_membresia(user))
    )


def _secciones_con_membresia(user):
    ahora = timezone.now()
    return (
        SectionMembership.objects
        .filter(user=user, is_active=True)
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=ahora))
        .values_list('section_id', flat=True)
    )


def puede_ver_el_contenido(user, course):
    """
    AMBITO>> Si este usuario tiene derecho al contenido del curso, no solo a su ficha.

    Ver la vitrina y ver el contenido son cosas distintas: cualquiera puede leer
    el temario de un curso con vitrina, pero las lecciones y los videos solo
    salen para quien tiene acceso real.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'role', None) == 'admin' or user.is_superuser:
        return True
    if course.instructor_id == user.id:
        return True
    if course.section_id is None:
        return False
    return course.section_id in set(_secciones_con_membresia(user))


def cursos_visibles_para(user, *, con_conteos=False):
    """
    AMBITO>> Cursos que este usuario puede ver listados.

    Es la base de cualquier listado de cursos. Quien necesite algo distinto que
    parta de aqui y filtre encima, en vez de armar su propio queryset.
    """
    qs = Course.objects.select_related('instructor', 'category', 'section')
    if con_conteos:
        qs = qs.annotate(
            total_lessons=Count('modules__lessons'),
            students_count=Count('enrollments'),
            materials_count=Count('materials', distinct=True),
        )

    role = getattr(user, 'role', None)
    autenticado = bool(user and user.is_authenticated)

    if role == 'admin' or (autenticado and user.is_superuser):
        return qs.order_by('-created_at')

    visibles = secciones_visibles_para(user)
    if role == 'instructor':
        # El instructor ve ademas sus propios cursos, publicados o no.
        qs = qs.filter(
            Q(status='published', section__in=visibles)
            | (Q(instructor=user) & (Q(section__isnull=True) | Q(section__in=_secciones_de_instructor(user))))
        )
    else:
        qs = qs.filter(status='published', section__in=visibles)

    return qs.order_by('-created_at')


def _secciones_de_instructor(user):
    return (
        SectionMembership.objects
        .filter(user=user, is_active=True, role=SectionMembership.Role.INSTRUCTOR)
        .values_list('section_id', flat=True)
    )


def curso_visible_o_404(user, course_id):
    """
    Un curso que este usuario puede ver, o 404.

    404 y no 403 a proposito: el filtro se aplica ANTES de buscar por id, asi que
    un curso ajeno y uno inexistente son indistinguibles. Un 403 confirmaria que
    el curso existe y permitiria contarlos por enumeracion.
    """
    curso = cursos_visibles_para(user).filter(pk=course_id).first()
    if curso is None:
        raise Http404('No existe ese curso.')
    return curso


def curso_inscribible_o_404(user, course_id):
    """
    Un curso en el que este usuario puede inscribirse, o 404.

    Mas estricto que `curso_visible_o_404`: ver la vitrina de un curso no da
    derecho a inscribirse en el. Hay que tener acceso a su academia.
    """
    curso = (
        Course.objects
        .filter(pk=course_id, status='published')
        .select_related('section')
        .first()
    )
    if curso is None or not puede_ver_el_contenido(user, curso):
        raise Http404('No existe ese curso.')
    return curso


def leccion_accesible_o_404(user, lesson_id):
    """Una leccion cuyo curso este usuario puede ver por dentro, o 404."""
    leccion = (
        Lesson.objects
        .select_related('module__course__section', 'module__course__instructor')
        .filter(pk=lesson_id)
        .first()
    )
    if leccion is None or not puede_ver_el_contenido(user, leccion.module.course):
        raise Http404('No existe esa leccion.')
    return leccion
