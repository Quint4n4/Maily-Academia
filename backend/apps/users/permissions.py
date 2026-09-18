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
    Solo el superadministrador. Hay uno, y lo garantiza la base de datos.

    Hasta el 2026-09-18 esta clase dejaba pasar a cualquier `role == 'admin'`, a
    cualquier staff y a cualquier superuser, y solo miraba `is_super_admin` en la
    ultima linea --a la que no llegaba nadie--. O sea: existia una columna, una
    clase de permiso y una ruta llamadas "superadmin" que no distinguian nada.
    Eso es peor que no tenerlas, porque hacen creer que algo esta protegido.

    Ahora exige el flag y solo el flag. Se quitaron los tres atajos a proposito:

      · `role == 'admin'` era el que anulaba la distincion entera.
      · `is_staff` y `is_superuser` son permisos del admin de Django, otra
        puerta con otro proposito. Quien los tenga puede entrar por ahi y
        cambiar la base; lo que no debe es heredar este nivel sin que nadie se
        lo haya dado. Ademas `admin@gmail.com` en produccion es superuser con
        `role='student'`, asi que ese atajo repartia el nivel por accidente.

    AMBITO>> este permiso es lo unico que protege los endpoints de videos
    promocionales (`apps/sections/views.py`). El guardian del frontend no cuenta:
    esconder un boton no es un permiso, porque cualquiera puede llamar a la API
    sin pasar por la pantalla.
    """

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, 'is_super_admin', False))


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
