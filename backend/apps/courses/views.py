import os
import tempfile
from django.conf import settings as django_settings
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sections.models import SectionMembership
from apps.users.models import SurveyResponse
from apps.users.permissions import IsAdmin, IsAdminOrInstructor, IsInstructorOwner

from .models import Category, Course, CourseMaterial, Module, Lesson
from .permissions import CanDownloadCourseMaterial, CanListCourseMaterials, CanManageCourseMaterial
from apps.progress.activity_logger import log_activity
from .serializers import (
    CategoryAdminSerializer,
    CategoryDetailSerializer,
    CategoryPublicSerializer,
    CourseListSerializer,
    CourseDetailSerializer,
    CourseCreateUpdateSerializer,
    CourseMaterialSerializer,
    CourseMaterialUpdateSerializer,
    CourseMaterialUploadSerializer,
    ModuleCreateSerializer,
    ModuleSerializer,
    LessonCreateSerializer,
    LessonSerializer,
)


# ---------------------------------------------------------------------------
# Courses
# ---------------------------------------------------------------------------

def _instructor_section_ids(user):
    """Section IDs where the user has SectionMembership with role=instructor (for course create/list filter)."""
    if not user or user.role != 'instructor':
        return []
    return list(
        SectionMembership.objects.filter(
            user=user,
            is_active=True,
            role=SectionMembership.Role.INSTRUCTOR,
        )
        .values_list('section_id', flat=True)
    )


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
        qs = Course.objects.select_related('instructor', 'category').annotate(
            total_lessons=Count('modules__lessons'),
            students_count=Count('enrollments'),
            materials_count=Count('materials', distinct=True),
        )
        if not self.request.user.is_authenticated or self.request.user.role == 'student':
            qs = qs.filter(status='published')
        elif self.request.user.role == 'instructor':
            section_ids = _instructor_section_ids(self.request.user)
            qs = qs.filter(
                Q(status='published') | (Q(instructor=self.request.user) & (Q(section__isnull=True) | Q(section_id__in=section_ids)))
            )

        # Filtros adicionales por categoría y tags (Fase 3)
        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        tags_param = self.request.query_params.get('tags')
        if tags_param:
            tags = [t.strip() for t in tags_param.split(',') if t.strip()]
            if tags:
                qs = qs.filter(tags__contains=tags)
        return qs

    filterset_fields = ['level', 'status', 'instructor']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'rating', 'title']

    def perform_create(self, serializer):
        user = self.request.user
        section = serializer.validated_data.get('section')

        if user.role == 'instructor':
            if section is None:
                # Auto-assign the instructor's active section membership
                auto_membership = (
                    SectionMembership.objects
                    .filter(user=user, role=SectionMembership.Role.INSTRUCTOR, is_active=True)
                    .select_related('section')
                    .first()
                )
                if auto_membership:
                    serializer.save(instructor=user, section=auto_membership.section)
                    return
            else:
                section_ids = _instructor_section_ids(user)
                if section.id not in section_ids:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied('Solo puedes crear cursos en secciones donde eres instructor.')

        serializer.save(instructor=user)


class RecommendedCoursesView(generics.ListAPIView):
    """
    GET /api/courses/recommended/ – Cursos recomendados según encuesta de intereses.

    - Requiere usuario autenticado.
    - Si no hay encuesta, devuelve una lista limitada de cursos destacados.
    """

    serializer_class = CourseListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = Course.objects.filter(status=Course.Status.PUBLISHED)

        # Filtrar por sección si se proporciona (evita mezclar cursos de academias distintas)
        section_slug = self.request.query_params.get('section')
        if section_slug:
            base_qs = base_qs.filter(section__slug=section_slug)

        try:
            survey = SurveyResponse.objects.get(user=user)
            interests = survey.interests or []
        except SurveyResponse.DoesNotExist:
            interests = []

        qs = base_qs

        # Si hay intereses y el modelo Course ya tiene category/tags (Fase 3), usarlos.
        if interests:
            interest_filter = Q()
            if hasattr(Course, 'category'):
                interest_filter |= Q(category__slug__in=interests)
            if hasattr(Course, 'tags'):
                for slug in interests:
                    interest_filter |= Q(tags__contains=[slug])
            if interest_filter:
                qs = qs.filter(interest_filter)

        # Si aún no hay categorías/tags o el filtro quedó vacío, usar fallback de cursos destacados.
        if not interests or not qs.exists():
            qs = base_qs.order_by('-rating', '-created_at')[:6]
        else:
            qs = qs.order_by('-rating', '-created_at')[:6]

        return qs


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
        qs = Course.objects.select_related('instructor', 'category').prefetch_related(
            'modules__lessons', 'modules__quiz',
        ).annotate(
            total_lessons=Count('modules__lessons'),
            students_count=Count('enrollments'),
            materials_count=Count('materials', distinct=True),
        )
        if self.request.method not in ('GET', 'HEAD', 'OPTIONS') and self.request.user.role == 'instructor':
            section_ids = _instructor_section_ids(self.request.user)
            qs = qs.filter(
                Q(instructor=self.request.user) & (Q(section__isnull=True) | Q(section_id__in=section_ids))
            )
        return qs

    def perform_update(self, serializer):
        user = self.request.user
        section = serializer.validated_data.get('section')
        if user.role == 'instructor' and section is not None:
            section_ids = _instructor_section_ids(user)
            if section.id not in section_ids:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Solo puedes asignar cursos a secciones donde eres instructor.')
        serializer.save()

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


# ---------------------------------------------------------------------------
# Categories (Fase 3)
# ---------------------------------------------------------------------------


class CategoryListView(generics.ListAPIView):
    """
    GET /api/categories/ – Lista de categorías activas.

    Parámetros opcionales:
    - ?section=slug  → filtra por sección (incluye categorías globales con section=null).
    - ?parent=slug   → filtra por categoría padre.
    """

    serializer_class = CategoryPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Category.objects.filter(is_active=True)

        section_slug = self.request.query_params.get('section')
        if section_slug:
            qs = qs.filter(Q(section__slug=section_slug) | Q(section__isnull=True))

        parent_slug = self.request.query_params.get('parent')
        if parent_slug:
            qs = qs.filter(parent__slug=parent_slug)

        return qs.order_by('order', 'name')


class CategoryDetailView(generics.RetrieveAPIView):
    """
    GET /api/categories/{slug}/ – Detalle de categoría con subcategorías.
    """

    serializer_class = CategoryDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return Category.objects.filter(is_active=True).select_related('section', 'parent').prefetch_related(
            'children',
        )


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/categories/       – Lista todas las categorías.
    POST /api/admin/categories/       – Crea una categoría.

    Solo para admin global.
    """

    serializer_class = CategoryAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Category.objects.select_related('section', 'parent').all().order_by('order', 'name')


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/admin/categories/{slug}/   – Detalle de categoría.
    PATCH  /api/admin/categories/{slug}/   – Actualiza categoría.
    DELETE /api/admin/categories/{slug}/   – Archiva (desactiva) categoría.
    """

    serializer_class = CategoryAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = 'slug'

    def get_queryset(self):
        return Category.objects.select_related('section', 'parent').all()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


# ---------------------------------------------------------------------------
# Material de apoyo (Fase 4)
# ---------------------------------------------------------------------------

class CourseMaterialListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/courses/{course_id}/materials/  – Listar materiales (filtros: ?module=id, ?lesson=id)
    POST /api/courses/{course_id}/materials/  – Subir material (multipart). Instructor o admin.
    """

    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), CanListCourseMaterials()]
        return [IsAuthenticated(), CanManageCourseMaterial()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CourseMaterialUploadSerializer
        return CourseMaterialSerializer

    def get_queryset(self):
        course_id = self.kwargs['course_id']
        qs = CourseMaterial.objects.filter(course_id=course_id).select_related(
            'module', 'lesson', 'uploaded_by',
        ).order_by('order', 'created_at')
        module_id = self.request.query_params.get('module')
        if module_id:
            qs = qs.filter(module_id=module_id)
        lesson_id = self.request.query_params.get('lesson')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context['course'] = Course.objects.get(pk=self.kwargs['course_id'])
        except Course.DoesNotExist:
            pass
        return context

    def perform_create(self, serializer):
        course = Course.objects.get(pk=self.kwargs['course_id'])
        serializer.save(course=course)


class MaterialDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/materials/{id}/  – Detalle (opcional)
    PATCH  /api/materials/{id}/  – Actualizar título/descripción/orden. Instructor o admin.
    DELETE /api/materials/{id}/  – Eliminar. Instructor o admin.
    """

    serializer_class = CourseMaterialSerializer
    permission_classes = [IsAuthenticated, CanManageCourseMaterial]
    queryset = CourseMaterial.objects.select_related('course', 'module', 'lesson', 'uploaded_by').all()

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return CourseMaterialUpdateSerializer
        return CourseMaterialSerializer

    def get_serializer(self, *args, **kwargs):
        if self.request.method in ('PATCH', 'PUT'):
            return CourseMaterialUpdateSerializer(*args, **kwargs)
        return super().get_serializer(*args, **kwargs)


class MaterialDownloadView(APIView):
    """
    GET /api/materials/{id}/download/  – Descarga el archivo (alumno inscrito o instructor/admin).
    Incrementa download_count.
    """

    permission_classes = [IsAuthenticated, CanDownloadCourseMaterial]

    def get(self, request, pk):
        from django.http import FileResponse
        material = get_object_or_404(CourseMaterial.objects.all(), pk=pk)
        self.check_object_permissions(request, material)
        material.download_count += 1
        material.save(update_fields=['download_count'])
        log_activity(
            request.user,
            'material_downloaded',
            'material',
            material.id,
            {'material_id': material.id, 'file_type': getattr(material, 'file_type', '')},
        )
        if not material.file:
            return Response(
                {'detail': 'El archivo no está disponible.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            response = FileResponse(
                material.file.open('rb'),
                as_attachment=True,
                filename=material.original_filename or material.title,
            )
            return response
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
