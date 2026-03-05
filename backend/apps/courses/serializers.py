from rest_framework import serializers

from apps.sections.models import Section

from .models import Category, Course, CourseMaterial, Module, Lesson


class CategorySummarySerializer(serializers.ModelSerializer):
    """Serializer ligero para mostrar categoría en cursos."""

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon']
        read_only_fields = fields


class CategoryPublicSerializer(serializers.ModelSerializer):
    """Serializer público para listar categorías."""

    section = serializers.SlugField(source='section.slug', read_only=True)
    parent = serializers.SlugField(source='parent.slug', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'section', 'parent', 'order']
        read_only_fields = fields


class CategoryDetailSerializer(serializers.ModelSerializer):
    """Detalle de categoría incluyendo subcategorías hijas."""

    section = serializers.SlugField(source='section.slug', read_only=True)
    parent = serializers.SlugField(source='parent.slug', read_only=True)
    children = CategoryPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'icon',
            'section',
            'parent',
            'order',
            'is_active',
            'created_at',
            'children',
        ]
        read_only_fields = fields


class CategoryAdminSerializer(serializers.ModelSerializer):
    """Serializer para CRUD de categorías en panel admin."""

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'icon',
            'parent',
            'section',
            'order',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LessonSerializer(serializers.ModelSerializer):
    video_url = serializers.URLField(required=False, allow_blank=True, default='')

    class Meta:
        model = Lesson
        fields = [
            'id', 'module', 'title', 'description',
            'video_url', 'video_provider', 'duration', 'order',
        ]
        read_only_fields = ['id']


class LessonCreateSerializer(serializers.ModelSerializer):
    """Used when creating lessons within a module context."""

    video_url = serializers.URLField(required=False, allow_blank=True, default='')

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'video_url', 'video_provider', 'duration', 'order']
        read_only_fields = ['id']


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    quiz = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'course', 'title', 'description', 'order', 'lessons', 'quiz']
        read_only_fields = ['id']

    def get_quiz(self, obj):
        try:
            q = obj.quiz
            return {'id': q.id, 'title': q.title, 'passing_score': q.passing_score}
        except Exception:
            return None


class ModuleCreateSerializer(serializers.ModelSerializer):
    """Used when creating modules within a course context."""

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order']
        read_only_fields = ['id']


class CourseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the course list endpoint."""

    instructor_name = serializers.SerializerMethodField()
    total_lessons = serializers.IntegerField(read_only=True, default=0)
    students_count = serializers.IntegerField(read_only=True, default=0)
    materials_count = serializers.IntegerField(read_only=True, default=0)
    category = CategorySummarySerializer(read_only=True)
    section_slug = serializers.SlugRelatedField(source='section', slug_field='slug', read_only=True)
    section_name = serializers.StringRelatedField(source='section', read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'thumbnail', 'level',
            'duration', 'status', 'price', 'rating', 'instructor', 'instructor_name',
            'total_lessons', 'students_count', 'materials_count',
            'require_sequential_progress',
            'requires_final_evaluation', 'final_evaluation_duration_default',
            'created_at',
            'category',
            'tags',
            'section_slug', 'section_name',
        ]
        read_only_fields = ['id', 'rating', 'created_at']

    def get_instructor_name(self, obj):
        return obj.instructor.get_full_name() or obj.instructor.username


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full serializer including nested modules and lessons."""

    instructor_name = serializers.SerializerMethodField()
    modules = ModuleSerializer(many=True, read_only=True)
    total_lessons = serializers.IntegerField(read_only=True, default=0)
    students_count = serializers.IntegerField(read_only=True, default=0)
    materials_count = serializers.IntegerField(read_only=True, default=0)
    category = CategorySummarySerializer(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'thumbnail', 'level',
            'duration', 'status', 'price', 'rating', 'instructor', 'instructor_name',
            'total_lessons', 'students_count', 'materials_count',
            'require_sequential_progress',
            'requires_final_evaluation', 'final_evaluation_duration_default',
            'created_at', 'updated_at', 'modules',
            'category',
            'tags',
        ]
        read_only_fields = ['id', 'rating', 'created_at', 'updated_at']

    def get_instructor_name(self, obj):
        return obj.instructor.get_full_name() or obj.instructor.username


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating / updating a course."""

    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )
    section_id = serializers.PrimaryKeyRelatedField(
        source='section',
        queryset=Section.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'description',
            'thumbnail',
            'level',
            'duration',
            'status',
            'price',
            'require_sequential_progress',
            'requires_final_evaluation',
            'final_evaluation_duration_default',
            'category_id',
            'section_id',
            'tags',
        ]
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# Material de apoyo (Fase 4)
# ---------------------------------------------------------------------------

class CourseMaterialSerializer(serializers.ModelSerializer):
    """Serializer para listar y detalle de material."""

    module_title = serializers.CharField(source='module.title', read_only=True, allow_null=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True, allow_null=True)
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseMaterial
        fields = [
            'id', 'course', 'module', 'lesson',
            'title', 'description', 'file', 'file_type', 'file_size',
            'original_filename', 'uploaded_by', 'uploaded_by_name',
            'download_count', 'order', 'created_at',
            'module_title', 'lesson_title',
        ]
        read_only_fields = [
            'id', 'file', 'file_type', 'file_size', 'original_filename',
            'uploaded_by', 'download_count', 'created_at',
        ]

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or getattr(obj.uploaded_by, 'email', '') if obj.uploaded_by else ''


class CourseMaterialUploadSerializer(serializers.ModelSerializer):
    """Serializer para subir material (multipart). Valida tipo y tamaño."""

    module = serializers.PrimaryKeyRelatedField(
        queryset=Module.objects.all(),
        required=False,
        allow_null=True,
    )
    lesson = serializers.PrimaryKeyRelatedField(
        queryset=Lesson.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CourseMaterial
        fields = ['title', 'description', 'file', 'module', 'lesson', 'order']

    def validate_file(self, value):
        if not value:
            raise serializers.ValidationError('El archivo es obligatorio.')
        ext = (value.name or '').rsplit('.', 1)[-1].lower()
        allowed = CourseMaterial.ALLOWED_EXTENSIONS
        if ext not in allowed:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Permitidos: {", ".join(sorted(allowed))}.'
            )
        if value.size > CourseMaterial.MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                f'El archivo no puede superar {CourseMaterial.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.'
            )
        return value

    def validate(self, attrs):
        course = self.context.get('course')
        module = attrs.get('module')
        lesson = attrs.get('lesson')
        if not course:
            raise serializers.ValidationError('Falta el curso en el contexto.')
        if lesson:
            if not module:
                module = lesson.module
                attrs['module'] = module
            elif lesson.module_id != module.id:
                raise serializers.ValidationError('La lección debe pertenecer al módulo seleccionado.')
        if module and module.course_id != course.id:
            raise serializers.ValidationError('El módulo debe pertenecer al curso.')
        if lesson and lesson.module.course_id != course.id:
            raise serializers.ValidationError('La lección debe pertenecer al curso.')

        # Límites por lección / módulo / curso
        qs = CourseMaterial.objects.filter(course=course)
        if qs.count() >= CourseMaterial.MAX_PER_COURSE:
            raise serializers.ValidationError(
                f'Máximo {CourseMaterial.MAX_PER_COURSE} materiales por curso.'
            )
        if module:
            mod_count = qs.filter(module=module).count()
            if mod_count >= CourseMaterial.MAX_PER_MODULE:
                raise serializers.ValidationError(
                    f'Máximo {CourseMaterial.MAX_PER_MODULE} materiales por módulo.'
                )
        if lesson:
            les_count = qs.filter(lesson=lesson).count()
            if les_count >= CourseMaterial.MAX_PER_LESSON:
                raise serializers.ValidationError(
                    f'Máximo {CourseMaterial.MAX_PER_LESSON} materiales por lección.'
                )
        return attrs

    def create(self, validated_data):
        # El curso viene en el contexto y también puede venir
        # inyectado en validated_data cuando se llama save(course=...).
        # Lo eliminamos de validated_data para evitar pasarlo dos veces
        # a CourseMaterial.objects.create.
        course = self.context['course']
        validated_data.pop('course', None)
        user = self.context.get('request').user if self.context.get('request') else None
        f = validated_data.get('file')
        ext = (f.name or '').rsplit('.', 1)[-1].lower()
        file_type_map = {
            'pdf': CourseMaterial.FileType.PDF,
            'pptx': CourseMaterial.FileType.PPTX, 'ppt': CourseMaterial.FileType.PPT,
            'docx': CourseMaterial.FileType.DOCX, 'doc': CourseMaterial.FileType.DOC,
            'xlsx': CourseMaterial.FileType.XLSX, 'xls': CourseMaterial.FileType.XLS,
            'png': CourseMaterial.FileType.IMAGE, 'jpg': CourseMaterial.FileType.IMAGE,
            'jpeg': CourseMaterial.FileType.IMAGE,
        }
        file_type = file_type_map.get(ext, CourseMaterial.FileType.OTHER)
        return CourseMaterial.objects.create(
            course=course,
            uploaded_by=user,
            file_type=file_type,
            file_size=f.size,
            original_filename=f.name or '',
            **validated_data,
        )


class CourseMaterialUpdateSerializer(serializers.ModelSerializer):
    """Solo título, descripción y orden para PATCH."""

    class Meta:
        model = CourseMaterial
        fields = ['title', 'description', 'order']
