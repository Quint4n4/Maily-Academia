from django.conf import settings
from django.db import models

from apps.courses.models import Lesson


class QnAQuestion(models.Model):
    """A question posted by a student on a lesson."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='qna_questions',
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='questions')
    title = models.CharField('título', max_length=255)
    body = models.TextField('descripción')
    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'pregunta Q&A'
        verbose_name_plural = 'preguntas Q&A'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class QnAAnswer(models.Model):
    """An answer to a Q&A question, typically from an instructor."""

    question = models.ForeignKey(QnAQuestion, on_delete=models.CASCADE, related_name='answers')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='qna_answers',
    )
    body = models.TextField('respuesta')
    is_accepted = models.BooleanField('aceptada', default=False)
    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'respuesta Q&A'
        verbose_name_plural = 'respuestas Q&A'
        ordering = ['-is_accepted', 'created_at']

    def __str__(self):
        return f'Respuesta de {self.user.email} a "{self.question.title}"'
