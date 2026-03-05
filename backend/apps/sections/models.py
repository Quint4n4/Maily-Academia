from django.conf import settings
from django.db import models
from django.utils import timezone


class Section(models.Model):
    """Área independiente dentro de la plataforma (Maily, Longevity, Corporativo)."""

    class SectionType(models.TextChoices):
        MAILY = 'maily', 'Maily Academia'
        PUBLIC = 'public', 'Pública'
        CORPORATE = 'corporate', 'Corporativo'

    name = models.CharField('nombre', max_length=100)
    slug = models.SlugField('slug', unique=True)
    description = models.TextField('descripción')
    section_type = models.CharField(
        'tipo de sección',
        max_length=20,
        choices=SectionType.choices,
    )
    logo = models.URLField('logo', blank=True, null=True)
    is_active = models.BooleanField('activa', default=True)
    require_credentials = models.BooleanField(
        'requiere credenciales especiales',
        default=False,
    )
    allow_public_preview = models.BooleanField(
        'permitir vista previa pública',
        default=False,
    )
    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'sección'
        verbose_name_plural = 'secciones'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class SectionMembership(models.Model):
    """Membresía de un usuario en una sección concreta."""

    class Role(models.TextChoices):
        STUDENT = 'student', 'Estudiante'
        INSTRUCTOR = 'instructor', 'Instructor'
        ADMIN = 'admin', 'Administrador'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='section_memberships',
        verbose_name='usuario',
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name='sección',
    )
    role = models.CharField(
        'rol en la sección',
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='granted_section_memberships',
        verbose_name='otorgado por',
    )
    is_active = models.BooleanField('activa', default=True)
    granted_at = models.DateTimeField('otorgada en', auto_now_add=True)
    expires_at = models.DateTimeField('expira en', null=True, blank=True)

    class Meta:
        verbose_name = 'membresía de sección'
        verbose_name_plural = 'membresías de sección'
        unique_together = ('user', 'section')

    def __str__(self) -> str:
        return f'{self.user} → {self.section} ({self.role})'

    @property
    def is_expired(self) -> bool:
        if self.expires_at and self.expires_at <= timezone.now():
            return True
        return False

    @property
    def is_active_and_valid(self) -> bool:
        return self.is_active and not self.is_expired


class PromoVideo(models.Model):
    """Videos de prueba/presentación de una sección (ej. Maily) mostrados en Longevity para promoción."""

    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='promo_videos',
        verbose_name='sección',
    )
    title = models.CharField('título', max_length=200)
    description = models.TextField('descripción', blank=True, default='')
    embed_url = models.URLField('URL del embed (YouTube, Vimeo, etc.)', max_length=500)
    duration = models.CharField(
        'duración',
        max_length=20,
        blank=True,
        default='',
        help_text='Ej: "3 min"',
    )
    order = models.PositiveIntegerField('orden', default=0)
    is_active = models.BooleanField('activo', default=True)
    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'video de promoción'
        verbose_name_plural = 'videos de promoción'
        ordering = ['section', 'order', 'id']

    def __str__(self) -> str:
        return f'{self.title} ({self.section.slug})'

