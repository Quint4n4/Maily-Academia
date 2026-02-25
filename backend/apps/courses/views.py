import os
import tempfile
from django.conf import settings as django_settings
from django.db.models import Count
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdminOrInstructor, IsInstructorOwner

from .models import Course, Module, Lesson
from .serializers import (
    CourseListSerializer,
    CourseDetailSerializer,
    CourseCreateUpdateSerializer,
    ModuleCreateSerializer,
    ModuleSerializer,
    LessonCreateSerializer,
    LessonSerializer,
)


# ---------------------------------------------------------------------------
# Courses
# ---------------------------------------------------------------------------

class CourseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/courses/          – public list (only published courses)
    POST /api/courses/          – create course (admin/instructor)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminOrInstructor()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CourseCreateUpdateSerializer
        return CourseListSerializer

    def get_queryset(self):
        qs = Course.objects.select_related('instructor').annotate(
            total_lessons=Count('modules__lessons'),
            students_count=Count('enrollments'),
        )
        if not self.request.user.is_authenticated or self.request.user.role == 'student':
            qs = qs.filter(status='published')
        elif self.request.user.role == 'instructor':
            from django.db.models import Q
            qs = qs.filter(Q(status='published') | Q(instructor=self.request.user))
        return qs

    filterset_fields = ['level', 'status', 'instructor']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'rating', 'title']

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/courses/{id}/   – course detail with modules
    PATCH  /api/courses/{id}/   – update (owner or admin)
    DELETE /api/courses/{id}/   – delete (admin only, and only if no enrollments/purchases)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsInstructorOwner()]

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return CourseCreateUpdateSerializer
        return CourseDetailSerializer

    def get_queryset(self):
        return Course.objects.select_related('instructor').prefetch_related(
            'modules__lessons', 'modules__quiz',
        ).annotate(
            total_lessons=Count('modules__lessons'),
            students_count=Count('enrollments'),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Solo un administrador puede eliminar cursos.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if instance.enrollments.exists() or instance.purchases.exists():
            return Response(
                {'detail': 'No se puede eliminar un curso con alumnos inscritos o compras. Despublica o archiva el curso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class UploadThumbnailView(APIView):
    """
    POST /api/courses/upload-thumbnail/
    Body: multipart/form-data with field 'file' (image).
    Returns: { "url": "<secure_url>" }.
    Only admin/instructor. Max 5 MB, images only (jpeg, png, gif, webp).
    """

    permission_classes = [IsAdminOrInstructor]

    ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
    MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        if not getattr(django_settings, 'CLOUDINARY_URL', None) or not django_settings.CLOUDINARY_URL:
            return Response(
                {'detail': 'Subida de imágenes no configurada (CLOUDINARY_URL).'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response(
                {'detail': 'Falta el archivo. Envía un campo "file" con la imagen.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded.content_type not in self.ALLOWED_CONTENT_TYPES:
            return Response(
                {'detail': 'Solo se permiten imágenes (JPEG, PNG, GIF, WebP).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded.size > self.MAX_SIZE_BYTES:
            return Response(
                {'detail': 'El archivo no puede superar 5 MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(cloudinary_url=os.environ.get('CLOUDINARY_URL'))
            # Cloudinary SDK works best with a file path; save Django upload to a temp file
            suffix = os.path.splitext(getattr(uploaded, 'name', ''))[1] or '.jpg'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                for chunk in uploaded.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            try:
                result = cloudinary.uploader.upload(
                    tmp_path,
                    folder='courses',
                    resource_type='image',
                )
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            url = result.get('secure_url')
            if not url:
                return Response(
                    {'detail': 'Error al subir la imagen.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            return Response({'url': url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'Error al subir la imagen: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )


# ---------------------------------------------------------------------------
# Modules
# ---------------------------------------------------------------------------

class ModuleCreateView(generics.CreateAPIView):
    """POST /api/courses/{course_id}/modules/ – create a module in a course."""

    serializer_class = ModuleCreateSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_create(self, serializer):
        course = Course.objects.get(pk=self.kwargs['course_id'])
        serializer.save(course=course)


class ModuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/modules/{id}/"""

    serializer_class = ModuleSerializer
    permission_classes = [IsAdminOrInstructor]
    queryset = Module.objects.prefetch_related('lessons')


# ---------------------------------------------------------------------------
# Lessons
# ---------------------------------------------------------------------------

class LessonCreateView(generics.CreateAPIView):
    """POST /api/modules/{module_id}/lessons/ – create a lesson in a module."""

    serializer_class = LessonCreateSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_create(self, serializer):
        module = Module.objects.get(pk=self.kwargs['module_id'])
        serializer.save(module=module)


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/lessons/{id}/"""

    serializer_class = LessonSerializer
    permission_classes = [IsAdminOrInstructor]
    queryset = Lesson.objects.all()


# ---------------------------------------------------------------------------
# Reordering
# ---------------------------------------------------------------------------

@api_view(['PATCH'])
@perm_classes([IsAdminOrInstructor])
def reorder_modules(request, course_id):
    """PATCH /api/courses/{course_id}/modules/reorder/
    Body: {"order": [3, 1, 2]}  – list of module IDs in desired order.
    """
    order = request.data.get('order', [])
    if not order:
        return Response({'detail': 'order is required'}, status=status.HTTP_400_BAD_REQUEST)
    modules = Module.objects.filter(course_id=course_id)
    id_set = set(modules.values_list('id', flat=True))
    for position, module_id in enumerate(order):
        if module_id in id_set:
            modules.filter(id=module_id).update(order=position + 1)
    return Response({'detail': 'ok'})


@api_view(['PATCH'])
@perm_classes([IsAdminOrInstructor])
def reorder_lessons(request, module_id):
    """PATCH /api/modules/{module_id}/lessons/reorder/
    Body: {"order": [5, 3, 4]}  – list of lesson IDs in desired order.
    """
    order = request.data.get('order', [])
    if not order:
        return Response({'detail': 'order is required'}, status=status.HTTP_400_BAD_REQUEST)
    lessons = Lesson.objects.filter(module_id=module_id)
    id_set = set(lessons.values_list('id', flat=True))
    for position, lesson_id in enumerate(order):
        if lesson_id in id_set:
            lessons.filter(id=lesson_id).update(order=position + 1)
    return Response({'detail': 'ok'})
