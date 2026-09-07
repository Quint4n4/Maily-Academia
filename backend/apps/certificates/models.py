import uuid

from django.conf import settings
from django.db import models

from apps.courses.models import Course


class Certificate(models.Model):
    """A certificate awarded when a student completes a course."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates',
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    verification_code = models.UUIDField(
        'código de verificación',
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    issued_at = models.DateTimeField('fecha de emisión', auto_now_add=True)

    class Meta:
        verbose_name = 'certificado'
        verbose_name_plural = 'certificados'
        unique_together = ['user', 'course']
        ordering = ['-issued_at']

    def __str__(self):
        return f'Certificado: {self.user.email} – {self.course.title}'
