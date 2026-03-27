from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.courses.models import Course, Lesson


class Purchase(models.Model):
    """Records course purchase via Stripe."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        COMPLETED = 'completed', 'Completado'
        FAILED = 'failed', 'Fallido'
        REFUNDED = 'refunded', 'Reembolsado'

    class RefundStatus(models.TextChoices):
        NONE = 'none', 'Sin reembolso'
        PARTIAL = 'partial', 'Parcial'
        FULL = 'full', 'Total'

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
    currency = models.CharField('moneda', max_length=3, default='mxn')
    status = models.CharField('estado', max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField('método de pago', max_length=20, default='card')

    # Stripe
    stripe_payment_intent_id = models.CharField(
        'Stripe PaymentIntent ID', max_length=255, unique=True, null=True, blank=True,
    )
    stripe_charge_id = models.CharField(
        'Stripe Charge ID', max_length=255, null=True, blank=True,
    )
    receipt_url = models.URLField('URL de recibo', max_length=500, blank=True, default='')

    # Cupón y descuento
    coupon = models.ForeignKey(
        'Coupon',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='purchases',
        verbose_name='cupón aplicado',
    )
    original_amount = models.DecimalField(
        'monto original', max_digits=10, decimal_places=2, null=True, blank=True,
    )
    discount_amount = models.DecimalField(
        'monto de descuento', max_digits=10, decimal_places=2, null=True, blank=True,
    )

    # Reembolsos
    refund_amount = models.DecimalField('monto reembolsado', max_digits=10, decimal_places=2, default=0)
    refund_status = models.CharField(
        'estado de reembolso', max_length=20,
        choices=RefundStatus.choices, default=RefundStatus.NONE,
    )
    refund_reason = models.TextField('razón del reembolso', blank=True, default='')

    # Metadata
    metadata = models.JSONField('metadata', default=dict, blank=True)
    created_at = models.DateTimeField('fecha de creación', null=True, blank=True, auto_now_add=True)
    completed_at = models.DateTimeField('fecha de pago completado', null=True, blank=True)
    # Backwards compat: paid_at se mantiene del modelo original
    paid_at = models.DateTimeField('fecha de pago', null=True, blank=True)

    class Meta:
        verbose_name = 'compra'
        verbose_name_plural = 'compras'
        ordering = ['-created_at']
        unique_together = ['user', 'course']

    def __str__(self):
        return f'{self.user.email} → {self.course.title} ({self.amount} {self.currency})'


class StripeWebhookEvent(models.Model):
    """Tracks processed Stripe webhook events for idempotency."""

    stripe_event_id = models.CharField('Stripe Event ID', max_length=255, unique=True)
    event_type = models.CharField('tipo de evento', max_length=100)
    payload = models.JSONField('payload', default=dict)
    processed = models.BooleanField('procesado', default=False)
    created_at = models.DateTimeField('recibido', auto_now_add=True)

    class Meta:
        verbose_name = 'evento webhook Stripe'
        verbose_name_plural = 'eventos webhook Stripe'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event_type} ({self.stripe_event_id})'


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
        ordering = ['-completed_at']

    def __str__(self):
        return f'{self.user.email} – {self.lesson.title} ({"✓" if self.completed else "✗"})'


class UserActivity(models.Model):
    """Registro de acciones del usuario para tracking y analytics (Fase 7)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    action = models.CharField('acción', max_length=50)
    resource_type = models.CharField('tipo de recurso', max_length=50)
    resource_id = models.PositiveIntegerField('ID del recurso', null=True, blank=True)
    metadata = models.JSONField('metadata', default=dict, blank=True)
    created_at = models.DateTimeField('fecha', auto_now_add=True)

    class Meta:
        verbose_name = 'actividad de usuario'
        verbose_name_plural = 'actividades de usuario'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]

    def __str__(self):
        return f'{self.user.email} – {self.action} @ {self.created_at}'


class Coupon(models.Model):
    """Cupón de descuento para cursos."""

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Porcentaje'
        FIXED = 'fixed', 'Monto fijo'

    code = models.CharField('código', max_length=50, unique=True, db_index=True)
    description = models.CharField('descripción', max_length=200, blank=True)
    discount_type = models.CharField(
        'tipo de descuento', max_length=20,
        choices=DiscountType.choices, default=DiscountType.PERCENTAGE,
    )
    discount_value = models.DecimalField(
        'valor del descuento', max_digits=10, decimal_places=2,
        help_text='Porcentaje (ej: 20) o monto fijo en MXN.',
    )
    max_uses = models.PositiveIntegerField(
        'usos máximos', default=0,
        help_text='0 = ilimitado.',
    )
    current_uses = models.PositiveIntegerField('usos actuales', default=0)
    valid_from = models.DateTimeField('válido desde', default=timezone.now)
    valid_until = models.DateTimeField('válido hasta', null=True, blank=True)
    is_active = models.BooleanField('activo', default=True)
    applicable_courses = models.ManyToManyField(
        'courses.Course',
        blank=True,
        verbose_name='cursos aplicables',
        help_text='Si está vacío, aplica a todos los cursos.',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='coupons_created',
        verbose_name='creado por',
    )
    created_at = models.DateTimeField('creado en', auto_now_add=True)

    class Meta:
        verbose_name = 'cupón'
        verbose_name_plural = 'cupones'
        ordering = ['-created_at']

    def __str__(self):
        simbolo = '%' if self.discount_type == self.DiscountType.PERCENTAGE else ' MXN'
        return f'{self.code} ({self.discount_value}{simbolo})'

    def is_valid(self, course=None):
        """Verifica si el cupón es válido para un curso específico.

        Retorna tupla (bool, str|None): (es_válido, mensaje_de_error).
        """
        now = timezone.now()
        if not self.is_active:
            return False, 'Cupón inactivo.'
        if self.valid_until and now > self.valid_until:
            return False, 'Cupón expirado.'
        if now < self.valid_from:
            return False, 'Cupón aún no está disponible.'
        if self.max_uses > 0 and self.current_uses >= self.max_uses:
            return False, 'Cupón agotado.'
        if course and self.applicable_courses.exists():
            if not self.applicable_courses.filter(pk=course.pk).exists():
                return False, 'Cupón no aplica para este curso.'
        return True, None

    def calculate_discount(self, original_price):
        """Calcula el descuento y retorna (precio_final, monto_descuento)."""
        if self.discount_type == self.DiscountType.PERCENTAGE:
            discount = original_price * (self.discount_value / 100)
        else:
            discount = min(self.discount_value, original_price)
        final_price = max(original_price - discount, 0)
        return final_price, discount


class Invoice(models.Model):
    """Factura/recibo de compra."""

    purchase = models.OneToOneField(
        Purchase,
        on_delete=models.CASCADE,
        related_name='invoice',
        verbose_name='compra',
    )
    invoice_number = models.CharField('número de factura', max_length=50, unique=True)
    issued_at = models.DateTimeField('emitida en', auto_now_add=True)
    pdf_url = models.URLField('URL del PDF', blank=True)

    class Meta:
        verbose_name = 'factura'
        verbose_name_plural = 'facturas'
        ordering = ['-issued_at']

    def __str__(self):
        return self.invoice_number

    @classmethod
    def generate_number(cls):
        """Genera número de factura secuencial: INV-YYYY-NNNNN."""
        year = timezone.now().year
        count = cls.objects.filter(invoice_number__startswith=f'INV-{year}-').count()
        return f'INV-{year}-{str(count + 1).zfill(5)}'
