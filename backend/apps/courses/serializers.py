from django.db.models import Count
from rest_framework import serializers

from apps.utils.limites_de_texto import LimitaTextoLibreMixin

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


class LessonCreateSerializer(LimitaTextoLibreMixin, serializers.ModelSerializer):
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


class ModuleCreateSerializer(LimitaTextoLibreMixin, serializers.ModelSerializer):
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


class LessonVitrinaSerializer(serializers.ModelSerializer):
    """
    Leccion tal y como la ve alguien que todavia no tiene acceso al curso.

    Trae el temario --titulo y duracion-- porque eso es lo que vende el curso, y
    deja fuera `video_url`: la URL del video ES el contenido. Con videos de
    YouTube publicos parece inofensivo; el dia que los videos vivan en un
    proveedor de pago, repartir esa URL es repartir el curso.

    Ver docs/00-deuda.md (P0) y la seccion de vitrina del PERFIL-DEL-REPO.
    """

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'duration', 'order']
        read_only_fields = fields


class ModuleVitrinaSerializer(serializers.ModelSerializer):
    lessons = LessonVitrinaSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order', 'lessons']
        read_only_fields = fields


class CourseVitrinaSerializer(CourseDetailSerializer):
    """Ficha publica de un curso: todo lo del detalle, con el temario sin videos."""

    modules = ModuleVitrinaSerializer(many=True, read_only=True)


class CourseCreateUpdateSerializer(LimitaTextoLibreMixin, serializers.ModelSerializer):
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

    def validate_status(self, value):
        """Impide publicar un curso sin contenido.

        El panel del instructor ya avisa de los requisitos, pero esa validacion
        vive en el navegador y se salta con una peticion directa a la API. Un
        curso publicado y vacio aparece en el catalogo del alumno y no tiene
        nada dentro, asi que la regla se aplica aqui.
        """
        if value != Course.Status.PUBLISHED:
            return value

        course = self.instance
        if course is None:
            # Alta: todavia no existen modulos, no se puede crear publicado.
            raise serializers.ValidationError(
                'Un curso nuevo no puede crearse publicado. Agrega al menos un '
                'modulo con una leccion y despues publicalo.'
            )

        if not course.modules.exists():
            raise serializers.ValidationError(
                'El curso necesita al menos un modulo antes de publicarse.'
            )

        # annotate + filter resuelve esto en UNA consulta; recorrer los modulos
        # y preguntar por sus lecciones haria una consulta por modulo (N+1).
        modulos_vacios = list(
            course.modules.annotate(n_lessons=Count('lessons'))
            .filter(n_lessons=0)
            .values_list('title', flat=True)
        )
        if modulos_vacios:
            raise serializers.ValidationError(
                'Estos modulos no tienen lecciones: ' + ', '.join(modulos_vacios) + '.'
            )

        return value


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
        # El archivo sale de `validated_data`: sirve para deducir tipo, tamaño y
        # nombre, pero NO se guarda en el modelo. Ya viajo a Cloudinary desde la
        # vista, y dejarlo aqui lo escribiria ademas en el disco del contenedor,
        # que es justo lo que se quiere evitar.
        f = validated_data.pop('file')
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
            file='',
            **validated_data,
        )


class CourseMaterialUpdateSerializer(LimitaTextoLibreMixin, serializers.ModelSerializer):
    """Solo título, descripción y orden para PATCH."""

    class Meta:
        model = CourseMaterial
        fields = ['title', 'description', 'order']
