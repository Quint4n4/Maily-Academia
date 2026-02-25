from decimal import Decimal

from django.conf import settings
from django.db import models


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
