import uuid

from django.conf import settings
from django.db import models

from apps.courses.models import Course


class Certificate(models.Model):
    """A certificate awarded when a student completes a course.

    Los cuatro campos de abajo --alumno, curso, maestro y academia-- son una
    copia congelada del momento de la emision, no una consulta viva.

    Por que: hasta el 2026-09-21 el PDF se dibujaba leyendo `course.title` y
    `course.instructor` en cada descarga. Renombrar un curso o reasignar a un
    maestro reescribia **todos los diplomas ya emitidos**, incluidos los que el
    alumno habia descargado meses antes. Un documento fechado que cambia solo no
    es un documento: es una consulta con marco dorado.

    El perfil del repo ya lo marcaba: `cumplimiento.registros_inmutables:
    ninguno`, con la nota de que los certificados deberian serlo.
    """

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

    # --- Copia congelada al emitir -------------------------------------
    # Van con default='' y no null para que el generador no tenga que
    # distinguir entre "vacio" y "nunca se lleno": si esta vacio, cae a la
    # relacion viva, que es lo unico que se puede hacer con los diplomas
    # emitidos antes de esta migracion.
    student_name = models.CharField('nombre del alumno', max_length=255, blank=True, default='')
    course_title = models.CharField('nombre del curso', max_length=255, blank=True, default='')
    instructor_name = models.CharField('nombre del maestro', max_length=255, blank=True, default='')
    section_name = models.CharField('academia', max_length=120, blank=True, default='')

    # El DISEÑO del día de la emisión, no solo los textos.
    #
    # Desde la fase 3 el maestro puede rediseñar la plantilla de su curso. Sin
    # esta copia, mover un elemento hoy reescribiría el aspecto de todos los
    # diplomas que ya descargaron sus alumnos: el mismo fallo que cerraron los
    # cuatro campos de arriba, pero sobre el layout en vez de sobre el texto.
    #
    # Se guarda el documento entero y no una FK a la plantilla, para que el
    # diploma sobreviva a que alguien borre la plantilla que lo produjo. Son
    # unos pocos KB por certificado.
    documento_congelado = models.JSONField(
        'diseño congelado', null=True, blank=True, default=None,
    )

    class Meta:
        verbose_name = 'certificado'
        verbose_name_plural = 'certificados'
        unique_together = ['user', 'course']
        ordering = ['-issued_at']

    def __str__(self):
        return f'Certificado: {self.user.email} – {self.course.title}'


class PlantillaDeDiploma(models.Model):
    """El diseño de un diploma, guardado como datos y no como código.

    El `documento` es el JSON que describe `docs/02-contrato-diplomas.md`: la
    lista de elementos con su posición en milímetros. Lo edita el maestro y lo
    interpreta `pdf.py`.
    """

    class Alcance(models.TextChoices):
        GLOBAL = 'global', 'De la plataforma'
        ACADEMIA = 'academia', 'De una academia'
        INSTRUCTOR = 'instructor', 'De un maestro'

    nombre = models.CharField('nombre', max_length=120)
    documento = models.JSONField('documento', default=dict)
    alcance = models.CharField(
        'alcance', max_length=20, choices=Alcance.choices, default=Alcance.INSTRUCTOR,
    )
    section = models.ForeignKey(
        'sections.Section',
        on_delete=models.CASCADE,
        related_name='plantillas_de_diploma',
        verbose_name='academia',
        null=True, blank=True,
        help_text='Obligatoria si el alcance es "academia".',
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='plantillas_de_diploma',
        verbose_name='dueño',
        null=True, blank=True,
        help_text='Obligatorio si el alcance es "instructor".',
    )
    es_semilla = models.BooleanField(
        'es la semilla',
        default=False,
        help_text='La que se copia al crear una plantilla nueva. Solo puede haber una.',
    )
    creado_en = models.DateTimeField('creado', auto_now_add=True)
    actualizado_en = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'plantilla de diploma'
        verbose_name_plural = 'plantillas de diploma'
        ordering = ['nombre']
        constraints = [
            # Que solo exista una semilla lo impone la tabla y no la disciplina:
            # es el mismo remedio que el indice unico parcial del
            # superadministrador. Con dos semillas, cual se copia al crear una
            # plantilla nueva depende del orden de la consulta.
            models.UniqueConstraint(
                fields=['es_semilla'],
                condition=models.Q(es_semilla=True),
                name='una_sola_plantilla_semilla',
            ),
        ]

    def __str__(self):
        return self.nombre


class RecursoDeDiploma(models.Model):
    """Una imagen que se puede montar en un diploma: marco, logo o sello.

    Por qué no hay tipo `firma`, que el contrato sí listaba: estas imágenes
    suben a Cloudinary como `image`, y Cloudinary **sí** las entrega por enlace
    directo. Un marco decorativo público no molesta a nadie; una firma
    manuscrita en una URL pública es una firma que cualquiera descarga y reusa.
    Entregarla en privado se puede —Cloudinary tiene entrega autenticada— pero
    no se ha medido contra la cuenta real, y prometer que una firma está
    protegida sin haberlo comprobado es peor que no ofrecerla.
    """

    class Tipo(models.TextChoices):
        MARCO = 'marco', 'Marco de fondo'
        LOGO = 'logo', 'Logotipo'
        SELLO = 'sello', 'Sello'

    class Alcance(models.TextChoices):
        GLOBAL = 'global', 'De la plataforma'
        ACADEMIA = 'academia', 'De una academia'
        INSTRUCTOR = 'instructor', 'De un maestro'

    tipo = models.CharField('tipo', max_length=20, choices=Tipo.choices)
    nombre = models.CharField('nombre', max_length=120)
    cloudinary_public_id = models.CharField('id en Cloudinary', max_length=255)
    ancho_px = models.PositiveIntegerField('ancho en píxeles', default=0)
    alto_px = models.PositiveIntegerField('alto en píxeles', default=0)
    alcance = models.CharField(
        'alcance', max_length=20, choices=Alcance.choices, default=Alcance.INSTRUCTOR,
    )
    section = models.ForeignKey(
        'sections.Section',
        on_delete=models.CASCADE,
        related_name='recursos_de_diploma',
        verbose_name='academia',
        null=True, blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recursos_de_diploma',
        verbose_name='dueño',
        null=True, blank=True,
    )
    creado_en = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        verbose_name = 'recurso de diploma'
        verbose_name_plural = 'recursos de diploma'
        ordering = ['tipo', 'nombre']

    def __str__(self):
        return f'{self.get_tipo_display()}: {self.nombre}'

    @property
    def proporcion(self) -> float:
        """Ancho dividido entre alto. El editor la necesita para no deformar."""
        return (self.ancho_px / self.alto_px) if self.alto_px else 1.0
