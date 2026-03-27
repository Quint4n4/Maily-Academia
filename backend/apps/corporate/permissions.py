"""Permisos para el portal corporativo."""
from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import BasePermission

CORPORATIVO_SLUG = 'corporativo-camsa'


class IsCorporativoMember(BasePermission):
    """Requiere membresía activa y no expirada en la sección corporativo-camsa."""
    message = 'No tienes acceso al portal corporativo.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        from apps.sections.models import SectionMembership
        now = timezone.now()
        return SectionMembership.objects.filter(
            user=request.user,
            section__slug=CORPORATIVO_SLUG,
            section__is_active=True,
            is_active=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).exists()


class IsCorporativoAdmin(BasePermission):
    """Superadmin global O admin de sección corporativo-camsa."""
    message = 'Se requiere rol de administrador del portal corporativo.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superadmin global
        if request.user.is_super_admin or request.user.role == 'admin' or request.user.is_superuser:
            return True
        # Admin de sección
        from apps.sections.models import SectionMembership
        now = timezone.now()
        return SectionMembership.objects.filter(
            user=request.user,
            section__slug=CORPORATIVO_SLUG,
            section__is_active=True,
            role='admin',
            is_active=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).exists()
