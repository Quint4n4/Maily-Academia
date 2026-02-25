from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


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
        return request.user.is_authenticated and request.user.role in ('admin', 'instructor')


class IsInstructorOwner(BasePermission):
    """Allow instructors to manage only their own resources."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return hasattr(obj, 'instructor') and obj.instructor == request.user


class IsOwnerOrAdmin(BasePermission):
    """Allow users to manage their own profile, or admins to manage any."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user


class ReadOnly(BasePermission):
    """Allow read-only access."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
