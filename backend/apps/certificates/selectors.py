"""
Quien ve y quien toca cada plantilla de diploma.

Vive en un selector y no repartido por las vistas porque eso es exactamente lo
que produjo las tres fugas del 2026-09-07: el filtro estaba en unas vistas y
faltaba en las de al lado. Toda vista que devuelva plantillas pasa por aqui.
"""

from __future__ import annotations

from django.db.models import Q
from django.http import Http404

from apps.courses.selectors import _secciones_de_instructor

from .models import PlantillaDeDiploma, RecursoDeDiploma


def _es_administrador(user) -> bool:
    return getattr(user, 'role', None) == 'admin' or bool(getattr(user, 'is_superuser', False))


def plantillas_visibles_para(user):
    """
    AMBITO>> Plantillas que este usuario puede usar.

    Un maestro ve las de la plataforma, las de las academias donde da clase y
    las suyas. Nada mas: las de un maestro de otra academia no existen para el.
    """
    if not user or not user.is_authenticated:
        return PlantillaDeDiploma.objects.none()

    if _es_administrador(user):
        return PlantillaDeDiploma.objects.all()

    if getattr(user, 'role', None) != 'instructor':
        # Un alumno no elige el diseno de su diploma.
        return PlantillaDeDiploma.objects.none()

    secciones = list(_secciones_de_instructor(user))
    return PlantillaDeDiploma.objects.filter(
        Q(alcance=PlantillaDeDiploma.Alcance.GLOBAL)
        | Q(alcance=PlantillaDeDiploma.Alcance.ACADEMIA, section_id__in=secciones)
        | Q(alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=user)
    ).distinct()


def plantillas_editables_por(user):
    """
    Las que ademas puede modificar.

    Ver una plantilla global y poder reescribirla son cosas distintas: si el
    maestro pudiera editar la de la plataforma, su cambio saldria en los
    diplomas de todas las academias.
    """
    if not user or not user.is_authenticated:
        return PlantillaDeDiploma.objects.none()

    if _es_administrador(user):
        return PlantillaDeDiploma.objects.all()

    if getattr(user, 'role', None) != 'instructor':
        return PlantillaDeDiploma.objects.none()

    return PlantillaDeDiploma.objects.filter(
        alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR, owner=user,
    )


def plantilla_visible_o_404(user, plantilla_id) -> PlantillaDeDiploma:
    """
    404 y no 403: el filtro se aplica ANTES de buscar por id, asi que una
    plantilla ajena y una inexistente son indistinguibles. Un 403 confirmaria
    que existe y permitiria contarlas por enumeracion.
    """
    plantilla = plantillas_visibles_para(user).filter(pk=plantilla_id).first()
    if plantilla is None:
        raise Http404('No existe esa plantilla.')
    return plantilla


def plantilla_editable_o_404(user, plantilla_id) -> PlantillaDeDiploma:
    plantilla = plantillas_editables_por(user).filter(pk=plantilla_id).first()
    if plantilla is None:
        raise Http404('No existe esa plantilla.')
    return plantilla


def recursos_visibles_para(user):
    """
    AMBITO>> Imagenes que este usuario puede montar en un diploma.

    Las de la plataforma, las de sus academias y las suyas. Este conjunto es el
    que alimenta `validar_documento(recursos_permitidos=...)`: sin el, basta con
    escribir el id de un recurso ajeno en el documento para montarlo.
    """
    if not user or not user.is_authenticated:
        return RecursoDeDiploma.objects.none()

    if _es_administrador(user):
        return RecursoDeDiploma.objects.all()

    if getattr(user, 'role', None) != 'instructor':
        return RecursoDeDiploma.objects.none()

    secciones = list(_secciones_de_instructor(user))
    return RecursoDeDiploma.objects.filter(
        Q(alcance=RecursoDeDiploma.Alcance.GLOBAL)
        | Q(alcance=RecursoDeDiploma.Alcance.ACADEMIA, section_id__in=secciones)
        | Q(alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=user)
    ).distinct()


def recursos_borrables_por(user):
    """Los suyos. Un maestro no borra el marco de la plataforma."""
    if not user or not user.is_authenticated:
        return RecursoDeDiploma.objects.none()

    if _es_administrador(user):
        return RecursoDeDiploma.objects.all()

    if getattr(user, 'role', None) != 'instructor':
        return RecursoDeDiploma.objects.none()

    return RecursoDeDiploma.objects.filter(
        alcance=RecursoDeDiploma.Alcance.INSTRUCTOR, owner=user,
    )


def ids_de_recursos_permitidos(user) -> set[int]:
    """Los ids que este usuario puede referenciar desde un documento."""
    return set(recursos_visibles_para(user).values_list('id', flat=True))


def recurso_borrable_o_404(user, recurso_id) -> RecursoDeDiploma:
    recurso = recursos_borrables_por(user).filter(pk=recurso_id).first()
    if recurso is None:
        raise Http404('No existe ese recurso.')
    return recurso
