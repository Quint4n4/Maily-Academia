from decimal import Decimal

from django.conf import settings
from django.db import models


class Category(models.Model):
    """Categoría temática para organizar cursos."""

    name = models.CharField('nombre', max_length=100)
    slug = models.SlugField('slug', unique=True)
    description = models.TextField('descripción', blank=True, default='')
    icon = models.CharField('icono', max_length=50, blank=True, default='')
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        related_name='children',
        null=True,
        blank=True,
        verbose_name='categoría padre',
    )
    section = models.ForeignKey(
        'sections.Section',
        on_delete=models.SET_NULL,
        related_name='categories',
        verbose_name='sección',
        null=True,
        blank=True,
        help_text='Si se establece, la categoría es específica de esa sección.',
    )
    order = models.IntegerField('orden', default=0)
    is_active = models.BooleanField('activa', default=True)
    created_at = models.DateTimeField('creada', auto_now_add=True)

    class Meta:
        verbose_name = 'categoría'
        verbose_name_plural = 'categorías'
        ordering = ['order', 'name']

    def __str__(self) -> str:
        return self.name


class Course(models.Model):
    """A course created by an instructor."""

    class Level(models.TextChoices):
        BEGINNER = 'beginner', 'Principiante'
        INTERMEDIATE = 'intermediate', 'Intermedio'
        ADVANCED = 'advanced', 'Avanzado'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Borrador'
        PUBLISHED = 'published', 'Publicado'
        ARCHIVED = 'archived', 'Archivado'

    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses_created',
        verbose_name='instructor',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name='courses',
        verbose_name='categoría principal',
        null=True,
        blank=True,
        help_text='Categoría principal del curso.',
    )
    tags = models.JSONField(
        'tags',
        default=list,
        blank=True,
        help_text='Lista de tags adicionales para filtrado libre.',
    )
    section = models.ForeignKey(
        'sections.Section',
        on_delete=models.SET_NULL,
        related_name='courses',
        verbose_name='sección',
        null=True,
        blank=True,
        help_text='Sección a la que pertenece el curso (Maily, Longevity 360, Corporativo).',
    )
    title = models.CharField('título', max_length=255)
    description = models.TextField('descripción')
    thumbnail = models.URLField('imagen miniatura', blank=True, default='')
    level = models.CharField('nivel', max_length=20, choices=Level.choices, default=Level.BEGINNER)
    duration = models.CharField('duración estimada', max_length=50, blank=True, default='')
    status = models.CharField('estado', max_length=20, choices=Status.choices, default=Status.DRAFT)
    price = models.DecimalField('precio', max_digits=10, decimal_places=2, default=Decimal('0'))
    rating = models.DecimalField('calificación', max_digits=3, decimal_places=2, default=0)
    require_sequential_progress = models.BooleanField(
        'requerir lecciones en orden',
        default=False,
        help_text='Si está activo, el alumno debe completar cada lección para desbloquear la siguiente.',
    )
    requires_final_evaluation = models.BooleanField(
        'requiere evaluación final',
        default=False,
        help_text='Si está activo, el certificado se otorga solo tras aprobar la evaluación final del curso.',
    )
    final_evaluation_duration_default = models.PositiveIntegerField(
        'duración predeterminada de evaluación (minutos)',
        default=60,
        help_text='Duración sugerida para la ventana de tiempo de la evaluación final.',
    )
    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'curso'
        verbose_name_plural = 'cursos'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Module(models.Model):
    """A module (section) within a course."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField('título', max_length=255)
    description = models.TextField('descripción', blank=True, default='')
    order = models.PositiveIntegerField('orden', default=0)

    class Meta:
        verbose_name = 'módulo'
        verbose_name_plural = 'módulos'
        ordering = ['order']

    def __str__(self):
        return f'{self.course.title} – {self.title}'


class Lesson(models.Model):
    """A single lesson inside a module."""

    class VideoProvider(models.TextChoices):
        YOUTUBE = 'youtube', 'YouTube'
        BUNNY = 'bunny', 'Bunny.net'
        CLOUDFLARE = 'cloudflare', 'Cloudflare Stream'
        MUX = 'mux', 'Mux'
        S3 = 's3', 'AWS S3'

    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField('título', max_length=255)
    description = models.TextField('descripción', blank=True, default='')
    video_url = models.URLField('URL del video', blank=True, default='', help_text='URL del video (YouTube embed por ahora)')
    video_provider = models.CharField(
        'proveedor de video',
        max_length=20,
        choices=VideoProvider.choices,
        default=VideoProvider.YOUTUBE,
    )
    duration = models.CharField('duración', max_length=20, blank=True, default='')
    order = models.PositiveIntegerField('orden', default=0)

    class Meta:
        verbose_name = 'lección'
        verbose_name_plural = 'lecciones'
        ordering = ['order']

    def __str__(self):
        return f'{self.module.title} – {self.title}'


# ---------------------------------------------------------------------------
# Material de apoyo (Fase 4)
# ---------------------------------------------------------------------------

def course_material_upload_path(instance, filename):
    """Store materials under materials/course_<id>/."""
    return f'materials/course_{instance.course_id}/{filename}'


class CourseMaterial(models.Model):
    """Archivo de apoyo (PDF, PPT, DOC, etc.) asociado a un curso, módulo o lección."""

    class FileType(models.TextChoices):
        PDF = 'pdf', 'PDF'
        PPTX = 'pptx', 'PowerPoint (pptx)'
        PPT = 'ppt', 'PowerPoint (ppt)'
        DOCX = 'docx', 'Word (docx)'
        DOC = 'doc', 'Word (doc)'
        XLSX = 'xlsx', 'Excel (xlsx)'
        XLS = 'xls', 'Excel (xls)'
        IMAGE = 'image', 'Imagen'
        OTHER = 'other', 'Otro'

    ALLOWED_EXTENSIONS = {
        'pdf', 'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls',
        'png', 'jpg', 'jpeg',
    }
    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
    MAX_PER_LESSON = 20
    MAX_PER_MODULE = 50
    MAX_PER_COURSE = 100

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='materials',
        verbose_name='curso',
    )
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name='materials',
        verbose_name='módulo',
        null=True,
        blank=True,
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='materials',
        verbose_name='lección',
        null=True,
        blank=True,
    )
    title = models.CharField('título', max_length=200)
    description = models.TextField('descripción', blank=True, default='')
    file = models.FileField('archivo', upload_to=course_material_upload_path)
    file_type = models.CharField('tipo de archivo', max_length=20, choices=FileType.choices)
    file_size = models.PositiveIntegerField('tamaño (bytes)', default=0)
    original_filename = models.CharField('nombre original', max_length=255, default='')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='uploaded_materials',
        null=True,
        verbose_name='subido por',
    )
    download_count = models.PositiveIntegerField('descargas', default=0)
    order = models.IntegerField('orden', default=0)
    created_at = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        verbose_name = 'material de apoyo'
        verbose_name_plural = 'materiales de apoyo'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f'{self.title} ({self.course.title})'
