"""
Reglas del diploma: como se emite y que se imprime.

Vive fuera de las vistas por lo mismo que `apps/courses/selectors.py`: cuando el
calculo esta repartido entre vistas, una de ellas se queda sin la regla y nadie
se entera hasta que sale mal en produccion.
"""

from __future__ import annotations

from django.conf import settings
from django.utils import timezone

from .models import Certificate
from .pdf import DatosDelDiploma

MESES = (
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
)


def nombre_de(usuario) -> str:
    """Como se llama alguien en un documento impreso.

    El correo es el ultimo recurso: un diploma que dice "juan92@gmail.com" donde
    va el nombre es peor que uno que dice el nombre de usuario.
    """
    if usuario is None:
        return ''
    completo = (usuario.get_full_name() or '').strip()
    return completo or (usuario.username or '').strip() or (usuario.email or '').strip()


def academia_de(course) -> str:
    """Nombre de la academia del curso, o cadena vacia.

    `Course.section` admite null (`on_delete=SET_NULL`), asi que un curso puede
    no tener academia y el diploma tiene que salir igual.
    """
    seccion = getattr(course, 'section', None)
    return seccion.name if seccion is not None else ''


def fecha_larga(momento) -> str:
    """'21 de septiembre de 2026', en la zona horaria del proyecto."""
    local = timezone.localtime(momento)
    return f'{local.day} de {MESES[local.month - 1]} de {local.year}'


def emitir_certificado(usuario, course) -> Certificate:
    """Crea el certificado congelando lo que dice hoy.

    Si ya existe, se devuelve tal cual: un diploma se emite una vez. La
    restriccion `unique_together` del modelo es la que lo garantiza de verdad;
    esto solo evita el error.
    """
    existente = Certificate.objects.filter(user=usuario, course=course).first()
    if existente is not None:
        return existente

    return Certificate.objects.create(
        user=usuario,
        course=course,
        student_name=nombre_de(usuario),
        course_title=course.title,
        instructor_name=nombre_de(course.instructor),
        section_name=academia_de(course),
    )


def datos_del_diploma(certificate: Certificate) -> DatosDelDiploma:
    """Lo que se imprime, leyendo la copia congelada.

    Los `or` son para los diplomas emitidos antes de que existieran estos
    campos: ahi no hay copia congelada y lo unico disponible es la relacion
    viva. La migracion 0002 rellena los que ya existian, asi que este camino
    solo queda para un certificado creado saltandose `emitir_certificado`.
    """
    codigo = str(certificate.verification_code)

    return DatosDelDiploma(
        alumno=certificate.student_name or nombre_de(certificate.user),
        curso=certificate.course_title or certificate.course.title,
        maestro=certificate.instructor_name or nombre_de(certificate.course.instructor),
        academia=certificate.section_name or academia_de(certificate.course),
        fecha=fecha_larga(certificate.issued_at),
        codigo=codigo,
        url_de_verificacion=f'{settings.FRONTEND_URL.rstrip("/")}/verify/{codigo}',
    )


def datos_de_ejemplo() -> DatosDelDiploma:
    """Datos para la vista previa del editor. No tocan la base ni emiten nada.

    Los valores son largos a proposito: un maestro que coloca los elementos con
    "Ana Ruiz" y "Curso 1" cree que todo cabe, y descubre que no el dia que se
    gradua alguien con cuatro apellidos.
    """
    codigo = '00000000-0000-4000-8000-000000000000'
    return DatosDelDiploma(
        alumno='María Fernanda Rodríguez Sánchez',
        curso='Introducción a la Medicina Regenerativa Aplicada',
        maestro='Carlos Rodríguez',
        academia='Longevity 360',
        fecha=fecha_larga(timezone.now()),
        codigo=codigo,
        url_de_verificacion=f'{settings.FRONTEND_URL.rstrip("/")}/verify/{codigo}',
    )
