import uuid
from datetime import date, timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """Custom user model with role-based access."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        INSTRUCTOR = 'instructor', 'Profesor'
        STUDENT = 'student', 'Estudiante'

    # Configuración de bloqueo de cuenta
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=30)

    email = models.EmailField('correo electrónico', unique=True)
    role = models.CharField(
        'rol',
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
    )
    
    # Campo de teléfono único para registro
    phone = models.CharField(
        'teléfono',
        max_length=20,
        unique=True,
        blank=True,
        null=True,
    )
    
    # Superadministrador: solo él puede otorgar/revocar acceso a sección Corporativo
    is_super_admin = models.BooleanField(
        'superadministrador',
        default=False,
    )

    # Stripe
    stripe_customer_id = models.CharField(
        'Stripe Customer ID',
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )

    # Campos para seguridad anti-DDoS
    failed_login_attempts = models.PositiveIntegerField(
        'intentos fallidos',
        default=0,
    )
    locked_until = models.DateTimeField(
        'bloqueado hasta',
        null=True,
        blank=True,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.get_full_name()} ({self.email})'

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_super_admin_user(self):
        return getattr(self, 'is_super_admin', False)

    @property
    def is_locked(self):
        """Verifica si la cuenta está actualmente bloqueada."""
        from django.utils import timezone
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def get_lockout_remaining_minutes(self):
        """Retorna los minutos restantes de bloqueo."""
        from django.utils import timezone
        if self.is_locked:
            remaining = (self.locked_until - timezone.now()).total_seconds() / 60
            return max(0, int(remaining))
        return 0

    def reset_login_attempts(self):
        """Resetea los intentos de login y desbloquea la cuenta."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.save(update_fields=['failed_login_attempts', 'locked_until'])

    def increment_failed_attempts(self):
        """Incrementa los intentos fallidos y bloquea si es necesario."""
        from django.utils import timezone
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= self.MAX_LOGIN_ATTEMPTS:
            self.locked_until = timezone.now() + self.LOCKOUT_DURATION
        self.save(update_fields=['failed_login_attempts', 'locked_until'])


class Profile(models.Model):
    """Extended profile information for any user."""

    class OccupationType(models.TextChoices):
        STUDENT = 'student', 'Estudiante'
        WORKER = 'worker', 'Trabajador'
        OTHER = 'other', 'Otro'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField('biografía', blank=True, default='')
    phone = models.CharField('teléfono', max_length=20, blank=True, default='')
    avatar = models.ImageField('avatar', upload_to='avatars/', blank=True, null=True)
    country = models.CharField('país', max_length=100, blank=True, default='')
    state = models.CharField('estado/provincia', max_length=100, blank=True, default='')
    city = models.CharField('ciudad', max_length=100, blank=True, default='')
    date_of_birth = models.DateField('fecha de nacimiento', null=True, blank=True)
    occupation_type = models.CharField(
        'tipo de ocupación',
        max_length=20,
        choices=OccupationType.choices,
        blank=True,
        default='',
    )
    has_completed_survey = models.BooleanField(
        'ha completado encuesta de intereses',
        default=False,
    )

    # Campos adicionales para perfil corporativo CAMSA
    employee_id = models.CharField(
        'número de empleado',
        max_length=50,
        blank=True,
        default='',
    )
    department = models.CharField(
        'departamento',
        max_length=100,
        blank=True,
        default='',
    )
    position = models.CharField(
        'puesto',
        max_length=100,
        blank=True,
        default='',
    )
    hire_date = models.DateField(
        'fecha de ingreso',
        null=True,
        blank=True,
    )
    emergency_contact_name = models.CharField(
        'nombre de contacto de emergencia',
        max_length=200,
        blank=True,
        default='',
    )
    emergency_contact_phone = models.CharField(
        'teléfono de contacto de emergencia',
        max_length=20,
        blank=True,
        default='',
    )

    class Meta:
        verbose_name = 'perfil'
        verbose_name_plural = 'perfiles'

    def __str__(self):
        return f'Perfil de {self.user.email}'

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        born = self.date_of_birth
        return today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )

    @property
    def is_corporate_profile_complete(self):
        """Verifica si el perfil corporativo está completo (foto, departamento y puesto)."""
        return bool(self.avatar and self.department and self.position)


class SurveyResponse(models.Model):
    """Initial interests survey for personalized recommendations."""

    class OccupationType(models.TextChoices):
        STUDENT = 'student', 'Estudiante'
        WORKER = 'worker', 'Trabajador'
        OTHER = 'other', 'Otro'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='survey_response',
        verbose_name='usuario',
    )
    occupation_type = models.CharField(
        'tipo de ocupación',
        max_length=20,
        choices=OccupationType.choices,
    )
    interests = models.JSONField(
        'intereses',
        default=list,
        help_text='Lista de slugs de categorías de interés.',
    )
    other_interests = models.TextField(
        'otros intereses',
        blank=True,
        default='',
    )
    completed_at = models.DateTimeField(
        'completado en',
        auto_now_add=True,
    )

    class Meta:
        verbose_name = 'encuesta de intereses'
        verbose_name_plural = 'encuestas de intereses'

    def __str__(self):
        return f'Encuesta de {self.user.email}'


class PasswordResetToken(models.Model):
    """Token para recuperación de contraseña por email."""
    
    TOKEN_EXPIRY_HOURS = 1
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='password_reset_tokens',
        verbose_name='usuario'
    )
    token = models.UUIDField(
        default=uuid.uuid4, 
        unique=True, 
        editable=False
    )
    created_at = models.DateTimeField(
        'creado en',
        auto_now_add=True
    )
    expires_at = models.DateTimeField(
        'expira en'
    )
    used = models.BooleanField(
        'usado',
        default=False
    )

    class Meta:
        verbose_name = 'token de recuperación'
        verbose_name_plural = 'tokens de recuperación'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=self.TOKEN_EXPIRY_HOURS)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        """Verifica si el token es válido (no usado y no expirado)."""
        return not self.used and self.expires_at > timezone.now()

    def __str__(self):
        status = 'válido' if self.is_valid else 'inválido'
        return f'Token para {self.user.email} ({status})'
