from django.conf import settings
from django.db import models

from apps.courses.models import Course, Module


class Quiz(models.Model):
    """A quiz attached to a module (prueba del módulo)."""

    module = models.OneToOneField(Module, on_delete=models.CASCADE, related_name='quiz')
    title = models.CharField('título', max_length=255)
    passing_score = models.PositiveIntegerField('puntaje para aprobar (%)', default=70)
    max_attempts = models.PositiveIntegerField(
        'máximo de intentos',
        default=0,
        help_text='0 = intentos ilimitados.',
    )

    class Meta:
        verbose_name = 'quiz'
        verbose_name_plural = 'quizzes'
        ordering = ['module']

    def __str__(self):
        return self.title


class Question(models.Model):
    """A question within a quiz; supports multiple types (multiple_choice, word_order, etc.)."""

    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = 'multiple_choice', 'Opción múltiple'
        TRUE_FALSE = 'true_false', 'Verdadero y falso'
        WORD_SEARCH = 'word_search', 'Sopa de letras'
        MATCHING = 'matching', 'Relacionar palabras'
        # Tipos deshabilitados por ahora (se mantienen para datos existentes):
        WORD_ORDER = 'word_order', 'Ordenar palabras'
        CROSSWORD = 'crossword', 'Crucigrama'
        FILL_BLANK = 'fill_blank', 'Llenar espacios'

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField('pregunta')
    question_type = models.CharField(
        'tipo de pregunta',
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.MULTIPLE_CHOICE,
    )
    options = models.JSONField(
        'opciones',
        help_text='Lista de opciones (para multiple_choice). Array JSON.',
        default=list,
        blank=True,
    )
    correct_answer = models.PositiveIntegerField(
        'índice de respuesta correcta',
        help_text='Índice base-0 de la opción correcta (multiple_choice)',
        null=True,
        blank=True,
    )
    config = models.JSONField(
        'configuración',
        help_text='Config específica del tipo (word_order: items, correct_order; matching: pairs; etc.)',
        default=dict,
        blank=True,
    )
    order = models.PositiveIntegerField('orden', default=0)

    class Meta:
        verbose_name = 'pregunta'
        verbose_name_plural = 'preguntas'
        ordering = ['order']

    def __str__(self):
        return self.text[:80]


class QuizAttempt(models.Model):
    """Records a student's attempt at a quiz."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts',
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    answers = models.JSONField(
        'respuestas',
        help_text='Objeto {question_id: selected_index}',
    )
    score = models.PositiveIntegerField('puntaje (%)', default=0)
    passed = models.BooleanField('aprobado', default=False)
    attempted_at = models.DateTimeField('fecha de intento', auto_now_add=True)

    class Meta:
        verbose_name = 'intento de quiz'
        verbose_name_plural = 'intentos de quiz'
        ordering = ['-attempted_at']

    def __str__(self):
        return f'{self.user.email} – {self.quiz.title} – {self.score}%'


class FinalEvaluation(models.Model):
    """Evaluación final asociada a un curso completo."""

    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name='final_evaluation',
        verbose_name='curso',
    )
    title = models.CharField('título', max_length=255, default='Evaluación final')
    passing_score = models.PositiveIntegerField(
        'puntaje para aprobar (%)',
        default=70,
        help_text='Porcentaje mínimo para aprobar la evaluación final.',
    )

    class Meta:
        verbose_name = 'evaluación final'
        verbose_name_plural = 'evaluaciones finales'
        ordering = ['course']

    def __str__(self):
        return f'{self.course.title} – {self.title}'


class FinalEvaluationQuestion(models.Model):
    """Pregunta de opción múltiple dentro de una evaluación final."""

    evaluation = models.ForeignKey(
        FinalEvaluation,
        on_delete=models.CASCADE,
        related_name='questions',
        verbose_name='evaluación',
    )
    text = models.TextField('pregunta')
    options = models.JSONField('opciones', help_text='Lista de opciones como array JSON')
    correct_answer = models.PositiveIntegerField(
        'índice de respuesta correcta',
        help_text='Índice base-0 de la opción correcta',
    )
    order = models.PositiveIntegerField('orden', default=0)

    class Meta:
        verbose_name = 'pregunta de evaluación'
        verbose_name_plural = 'preguntas de evaluación'
        ordering = ['order']

    def __str__(self):
        return self.text[:80]


class FinalEvaluationRequest(models.Model):
    """Solicitud de un alumno para realizar la evaluación final."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        APPROVED = 'approved', 'Aprobada'
        EXPIRED = 'expired', 'Expirada'
        COMPLETED = 'completed', 'Completada'
        FAILED = 'failed', 'Reprobada'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='final_evaluation_requests',
        verbose_name='alumno',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='final_evaluation_requests',
        verbose_name='curso',
    )
    evaluation = models.ForeignKey(
        FinalEvaluation,
        on_delete=models.CASCADE,
        related_name='requests',
        verbose_name='evaluación',
    )
    status = models.CharField(
        'estado',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    requested_at = models.DateTimeField('solicitada en', auto_now_add=True)
    approved_at = models.DateTimeField('aprobada en', null=True, blank=True)
    available_from = models.DateTimeField('disponible desde', null=True, blank=True)
    available_until = models.DateTimeField('disponible hasta', null=True, blank=True)

    class Meta:
        verbose_name = 'solicitud de evaluación final'
        verbose_name_plural = 'solicitudes de evaluación final'
        ordering = ['-requested_at']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'course'],
                condition=models.Q(status__in=['pending', 'approved']),
                name='unique_active_final_eval_request_per_course',
            ),
        ]

    def __str__(self):
        return f'{self.student.email} – {self.course.title} – {self.status}'


class FinalEvaluationAttempt(models.Model):
    """Intento de evaluación final de un alumno."""

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='final_evaluation_attempts',
        verbose_name='alumno',
    )
    evaluation = models.ForeignKey(
        FinalEvaluation,
        on_delete=models.CASCADE,
        related_name='attempts',
        verbose_name='evaluación',
    )
    request = models.ForeignKey(
        FinalEvaluationRequest,
        on_delete=models.SET_NULL,
        related_name='attempts',
        null=True,
        blank=True,
        verbose_name='solicitud',
    )
    answers = models.JSONField(
        'respuestas',
        help_text='Objeto {question_id: selected_index}',
    )
    score = models.PositiveIntegerField('puntaje (%)', default=0)
    passed = models.BooleanField('aprobado', default=False)
    attempted_at = models.DateTimeField('fecha de intento', auto_now_add=True)

    class Meta:
        verbose_name = 'intento de evaluación final'
        verbose_name_plural = 'intentos de evaluación final'
        ordering = ['-attempted_at']

    def __str__(self):
        return f'{self.student.email} – {self.evaluation} – {self.score}%'
