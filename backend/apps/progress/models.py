from django.conf import settings
from django.db import models

from apps.courses.models import Course, Lesson


class Purchase(models.Model):
    """Records course purchase (simulated payment)."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        COMPLETED = 'completed', 'Completado'
        FAILED = 'failed', 'Fallido'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purchases',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='purchases',
    )
    amount = models.DecimalField('monto', max_digits=10, decimal_places=2)
    status = models.CharField('estado', max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField('método de pago', max_length=20, default='card')
    paid_at = models.DateTimeField('fecha de pago', null=True, blank=True, auto_now_add=True)

    class Meta:
        verbose_name = 'compra'
        verbose_name_plural = 'compras'
        ordering = ['-paid_at']
        unique_together = ['user', 'course']

    def __str__(self):
        return f'{self.user.email} → {self.course.title} ({self.amount})'


class Enrollment(models.Model):
    """Tracks student enrollment in a course."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments',
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField('fecha de inscripción', auto_now_add=True)

    class Meta:
        verbose_name = 'inscripción'
        verbose_name_plural = 'inscripciones'
        unique_together = ['user', 'course']
        ordering = ['-enrolled_at']

    def __str__(self):
        return f'{self.user.email} → {self.course.title}'


class LessonProgress(models.Model):
    """Tracks whether a student has completed a specific lesson."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lesson_progress',
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='progress')
    completed = models.BooleanField('completada', default=True)
    completed_at = models.DateTimeField('fecha de completado', auto_now_add=True)
    video_position_seconds = models.PositiveIntegerField(
        'posición del video (segundos)',
        null=True,
        blank=True,
        help_text='Última posición de reproducción para reanudar.',
    )

    class Meta:
        verbose_name = 'progreso de lección'
        verbose_name_plural = 'progresos de lecciones'
        unique_together = ['user', 'lesson']

    def __str__(self):
        return f'{self.user.email} – {self.lesson.title} ({"✓" if self.completed else "✗"})'
