"""Modelos para el portal corporativo de Empleados CAMSA."""
from django.contrib.auth import get_user_model
from django.db import models
from django.utils.text import slugify


class BenefitType(models.Model):
    """Tipo de beneficio disponible para empleados corporativos."""

    BENEFIT_MODE_CHOICES = [
        ('appointment', 'Cita agendada'),
        ('request', 'Solicitud sin horario'),
    ]

    LIMIT_PERIOD_CHOICES = [
        ('monthly', 'Mensual'),
        ('yearly', 'Anual'),
        ('total', 'Total'),
    ]

    name = models.CharField('nombre', max_length=200)
    slug = models.SlugField('slug', unique=True, blank=True)
    description = models.TextField('descripción', blank=True)
    icon = models.CharField('ícono', max_length=50, blank=True, default='Gift',
                            help_text='Nombre del ícono Lucide')
    color = models.CharField('color', max_length=20, default='#e6c364',
                             help_text='Color hexadecimal')
    benefit_mode = models.CharField('modo de beneficio', max_length=20,
                                    choices=BENEFIT_MODE_CHOICES)
    requires_approval = models.BooleanField('requiere aprobación', default=False)
    max_per_employee = models.PositiveIntegerField(
        'máximo por empleado', default=0,
        help_text='0 = ilimitado'
    )
    limit_period = models.CharField('período de límite', max_length=20,
                                    choices=LIMIT_PERIOD_CHOICES, default='monthly')
    slot_duration_minutes = models.PositiveIntegerField(
        'duración del slot (minutos)', default=60,
        help_text='Solo aplica en modo cita agendada'
    )
    instructions = models.TextField('instrucciones', blank=True, default='')
    is_active = models.BooleanField('activo', default=True)
    order = models.PositiveIntegerField('orden', default=0)
    created_at = models.DateTimeField('fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('fecha de actualización', auto_now=True)

    class Meta:
        verbose_name = 'tipo de beneficio'
        verbose_name_plural = 'tipos de beneficio'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class BenefitRequest(models.Model):
    """Solicitud de beneficio tipo 'request' (sin horario) de un empleado."""

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
        ('delivered', 'Entregado'),
    ]

    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE,
        related_name='benefit_requests', verbose_name='empleado'
    )
    benefit_type = models.ForeignKey(
        BenefitType, on_delete=models.CASCADE,
        related_name='requests', verbose_name='tipo de beneficio'
    )
    status = models.CharField('estado', max_length=20,
                               choices=STATUS_CHOICES, default='pending')
    notes = models.TextField('notas del empleado', blank=True, default='')
    admin_notes = models.TextField('respuesta del administrador', blank=True, default='')
    reviewed_by = models.ForeignKey(
        get_user_model(), null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reviewed_requests',
        verbose_name='revisado por'
    )
    reviewed_at = models.DateTimeField('fecha de revisión', null=True, blank=True)
    created_at = models.DateTimeField('fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('fecha de actualización', auto_now=True)

    class Meta:
        verbose_name = 'solicitud de beneficio'
        verbose_name_plural = 'solicitudes de beneficio'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} — {self.benefit_type} ({self.get_status_display()})'


class AvailabilitySchedule(models.Model):
    """Horario semanal de disponibilidad para un tipo de beneficio."""

    DAY_CHOICES = [
        (0, 'Lunes'),
        (1, 'Martes'),
        (2, 'Miércoles'),
        (3, 'Jueves'),
        (4, 'Viernes'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]

    benefit_type = models.ForeignKey(
        BenefitType, on_delete=models.CASCADE,
        related_name='schedules', verbose_name='tipo de beneficio'
    )
    day_of_week = models.IntegerField('día de la semana', choices=DAY_CHOICES)
    start_time = models.TimeField('hora de inicio')
    end_time = models.TimeField('hora de fin')
    max_concurrent_slots = models.PositiveIntegerField('slots concurrentes máximos', default=1)
    is_active = models.BooleanField('activo', default=True)

    class Meta:
        verbose_name = 'horario de disponibilidad'
        verbose_name_plural = 'horarios de disponibilidad'
        ordering = ['day_of_week', 'start_time']
        unique_together = ('benefit_type', 'day_of_week', 'start_time')

    def __str__(self):
        return f'{self.benefit_type} — {self.get_day_of_week_display()} {self.start_time}'


class AvailabilityException(models.Model):
    """Excepción de disponibilidad (día bloqueado o con horario especial)."""

    benefit_type = models.ForeignKey(
        BenefitType, null=True, blank=True,
        on_delete=models.CASCADE, related_name='exceptions',
        verbose_name='tipo de beneficio'
    )
    date = models.DateField('fecha')
    is_blocked = models.BooleanField('bloqueado', default=True)
    start_time = models.TimeField('hora de inicio', null=True, blank=True)
    end_time = models.TimeField('hora de fin', null=True, blank=True)
    reason = models.CharField('motivo', max_length=200, blank=True)

    class Meta:
        verbose_name = 'excepción de disponibilidad'
        verbose_name_plural = 'excepciones de disponibilidad'
        ordering = ['date']

    def __str__(self):
        blocked = 'Bloqueado' if self.is_blocked else 'Horario especial'
        return f'{self.date} — {blocked} ({self.reason or "sin motivo"})'


class Reservation(models.Model):
    """Reservación de cita agendada de un empleado."""

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('confirmed', 'Confirmada'),
        ('cancelled', 'Cancelada'),
        ('completed', 'Completada'),
        ('no_show', 'No se presentó'),
    ]

    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE,
        related_name='reservations', verbose_name='empleado'
    )
    benefit_type = models.ForeignKey(
        BenefitType, on_delete=models.CASCADE,
        related_name='reservations', verbose_name='tipo de beneficio'
    )
    date = models.DateField('fecha')
    start_time = models.TimeField('hora de inicio')
    end_time = models.TimeField('hora de fin')
    status = models.CharField('estado', max_length=20,
                               choices=STATUS_CHOICES, default='pending')
    notes = models.TextField('notas del empleado', blank=True, default='')
    admin_notes = models.TextField('notas del administrador', blank=True, default='')
    cancelled_at = models.DateTimeField('fecha de cancelación', null=True, blank=True)
    cancelled_by = models.ForeignKey(
        get_user_model(), null=True, blank=True,
        on_delete=models.SET_NULL, related_name='cancelled_reservations',
        verbose_name='cancelado por'
    )
    cancellation_reason = models.TextField('motivo de cancelación', blank=True, default='')
    created_at = models.DateTimeField('fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('fecha de actualización', auto_now=True)

    class Meta:
        verbose_name = 'reservación'
        verbose_name_plural = 'reservaciones'
        ordering = ['-date', '-start_time']
        unique_together = ('benefit_type', 'date', 'start_time', 'user')
        indexes = [
            models.Index(
                fields=['benefit_type', 'date', 'status'],
                name='corp_res_ben_date_status_idx'
            ),
        ]

    def __str__(self):
        return f'{self.user} — {self.benefit_type} {self.date} {self.start_time}'


class Notification(models.Model):
    """Notificación in-app para empleados del portal corporativo."""

    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE,
        related_name='corporate_notifications', verbose_name='empleado'
    )
    title = models.CharField('título', max_length=200)
    message = models.TextField('mensaje')
    notification_type = models.CharField('tipo de notificación', max_length=50)
    related_object_type = models.CharField('tipo de objeto relacionado', max_length=50, blank=True)
    related_object_id = models.PositiveIntegerField('ID del objeto relacionado', null=True, blank=True)
    is_read = models.BooleanField('leída', default=False)
    created_at = models.DateTimeField('fecha de creación', auto_now_add=True)

    class Meta:
        verbose_name = 'notificación corporativa'
        verbose_name_plural = 'notificaciones corporativas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f'{self.user} — {self.title}'
