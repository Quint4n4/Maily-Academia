"""Permisos para materiales de apoyo (Fase 4)."""
from rest_framework.permissions import BasePermission


class CanManageCourseMaterial(BasePermission):
    """Instructor del curso o admin pueden subir, editar y eliminar materiales."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == 'admin':
            return True
        if request.user.role != 'instructor':
            return False
        course_id = view.kwargs.get('course_id')
        if not course_id:
            return True  # object-level will check for MaterialDetailView
        from .models import Course
        try:
            course = Course.objects.get(pk=course_id)
            return course.instructor_id == request.user.id
        except Course.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return getattr(obj, 'course', None) and obj.course.instructor_id == request.user.id


class CanDownloadCourseMaterial(BasePermission):
    """Alumno inscrito, instructor del curso o admin pueden descargar."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if getattr(obj, 'course', None) and obj.course.instructor_id == request.user.id:
            return True
        from apps.progress.models import Enrollment
        return Enrollment.objects.filter(
            user=request.user,
            course=obj.course,
        ).exists()


class CanListCourseMaterials(BasePermission):
    """Alumno inscrito, instructor del curso o admin pueden listar materiales."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        course_id = view.kwargs.get('course_id')
        if not course_id:
            return False
        from .models import Course
        from apps.progress.models import Enrollment
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return False
        if request.user.role == 'admin':
            return True
        if course.instructor_id == request.user.id:
            return True
        return Enrollment.objects.filter(user=request.user, course=course).exists()
