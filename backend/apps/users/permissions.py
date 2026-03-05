from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Allow access only to admin users (role admin, superuser or staff)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.role == 'admin'
            or request.user.is_superuser
            or request.user.is_staff
        )


class IsSuperAdmin(BasePermission):
    """
    Allow access to platform administrators for super-admin protected actions.

    Actualmente se considera "super admin" a cualquier usuario con rol global
    `admin` (y opcionalmente con el flag `is_super_admin` activado).
    """

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        # Superusers y staff tienen acceso total
        if user.is_superuser or user.is_staff:
            return True
        if getattr(user, 'role', None) == 'admin':
            return True
        return getattr(user, 'is_super_admin', False)


class IsInstructor(BasePermission):
    """Allow access only to instructor users."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'instructor'


class IsStudent(BasePermission):
    """Allow access only to student users."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsAdminOrInstructor(BasePermission):
    """Allow access to admin or instructor users."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        return request.user.role in ('admin', 'instructor')


class IsInstructorOwner(BasePermission):
    """Allow instructors to manage only their own resources."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin' or request.user.is_superuser or request.user.is_staff:
            return True
        return hasattr(obj, 'instructor') and obj.instructor == request.user


class IsOwnerOrAdmin(BasePermission):
    """Allow users to manage their own profile, or admins to manage any."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin' or request.user.is_superuser or request.user.is_staff:
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user


class ReadOnly(BasePermission):
    """Allow read-only access."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
