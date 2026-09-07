from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import BasePermission

from .models import Section, SectionMembership


class HasSectionAccess(BasePermission):
    """
    Verifica que el usuario tenga acceso a la sección indicada por slug.

    - Para secciones públicas (`section_type=public`): cualquier usuario autenticado tiene acceso.
      Esto evita romper el flujo actual mientras aún no se crean membresías explícitas para Longevity 360.
    - Para secciones Maily / Corporativo: requiere membresía activa y no expirada.
    """

    message = 'No tienes acceso a esta sección.'

    def has_permission(self, request, view) -> bool:
        slug = view.kwargs.get('slug')
        if not slug:
            return False

        try:
            section = Section.objects.get(slug=slug, is_active=True)
        except Section.DoesNotExist:
            return False

        # Guardar la sección en la vista para reutilizarla en get_queryset
        setattr(view, 'section', section)

        # Secciones públicas: basta con estar autenticado
        if section.section_type == Section.SectionType.PUBLIC:
            return request.user and request.user.is_authenticated

        if not request.user or not request.user.is_authenticated:
            return False

        now = timezone.now()
        return SectionMembership.objects.filter(
            user=request.user,
            section=section,
            is_active=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now),
        ).exists()


class IsSectionAdmin(BasePermission):
    """
    Verifica que el usuario sea administrador de la sección indicada por slug.

    Se considera administrador si tiene una membresía activa y no expirada con
    `role=admin` para esa sección.
    """

    message = 'Se requiere rol de administrador en esta sección.'

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        slug = view.kwargs.get('slug')
        if not slug:
            return False

        try:
            section = Section.objects.get(slug=slug, is_active=True)
        except Section.DoesNotExist:
            return False

        setattr(view, 'section', section)

        now = timezone.now()
        return SectionMembership.objects.filter(
            user=request.user,
            section=section,
            role=SectionMembership.Role.ADMIN,
            is_active=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now),
        ).exists()


class IsSectionInstructor(BasePermission):
    """
    Verifica que el usuario sea instructor de la sección indicada por slug.

    Se considera instructor si tiene una membresía activa y no expirada con
    `role=instructor` para esa sección.
    """

    message = 'Se requiere rol de instructor en esta sección.'

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        slug = view.kwargs.get('slug')
        if not slug:
            return False

        try:
            section = Section.objects.get(slug=slug, is_active=True)
        except Section.DoesNotExist:
            return False

        setattr(view, 'section', section)

        now = timezone.now()
        return SectionMembership.objects.filter(
            user=request.user,
            section=section,
            role=SectionMembership.Role.INSTRUCTOR,
            is_active=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now),
        ).exists()


class CanViewSectionPreview(BasePermission):
    """
    Permite acceso a la vista de preview de una sección cuando
    `allow_public_preview=True`, incluso sin autenticación.

    Pensado para usarse junto con AllowAny en el endpoint de preview.
    """

    message = 'La sección no permite vista previa pública.'

    def has_permission(self, request, view) -> bool:
        slug = view.kwargs.get('slug')
        if not slug:
            return False

        try:
            section = Section.objects.get(slug=slug, is_active=True)
        except Section.DoesNotExist:
            return False

        setattr(view, 'section', section)
        return bool(section.allow_public_preview)

