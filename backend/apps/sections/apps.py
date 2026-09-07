from django.apps import AppConfig
from django.db.models.signals import post_migrate


class SectionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sections'
    verbose_name = 'Secciones'

    def ready(self):
        """
        Inicializa datos base de secciones y asigna cursos existentes
        a la sección pública por defecto (Longevity 360) tras las migraciones.
        """
        from django.apps import apps as django_apps

        def handle_post_migrate(sender, **kwargs):
            from .models import Section

            # Crear/actualizar secciones base (idempotente)
            maily_defaults = {
                'name': 'Maily Academia',
                'description': 'Sección exclusiva para usuarios del software Maily.',
                'section_type': Section.SectionType.MAILY,
                'require_credentials': True,
                'allow_public_preview': True,
                'is_active': True,
            }
            longevity_defaults = {
                'name': 'Longevity 360',
                'description': 'Academia abierta orientada al área de salud.',
                'section_type': Section.SectionType.PUBLIC,
                'require_credentials': False,
                # Decision del 2026-09-03: Longevity y Maily tienen vitrina
                # publica para captar alumnos; Corporativo CAMSA no, es interno.
                'allow_public_preview': True,
                'is_active': True,
            }
            corporate_defaults = {
                'name': 'Corporativo CAMSA',
                'description': 'Sección exclusiva para miembros del corporativo CAMSA.',
                'section_type': Section.SectionType.CORPORATE,
                'require_credentials': True,
                'allow_public_preview': False,
                'is_active': True,
            }

            # `allow_public_preview` y `require_credentials` son POLITICA, no
            # identidad: se deciden en el admin, no en el codigo. Antes iban en
            # los defaults de update_or_create, asi que cada deploy revertia lo
            # que se hubiera configurado. Ahora solo se aplican al crear la
            # academia por primera vez; despues manda lo que diga la base.
            politica = ('require_credentials', 'allow_public_preview')

            def crear_o_actualizar(slug, defaults):
                iniciales = dict(defaults)
                identidad = {k: v for k, v in defaults.items() if k not in politica}
                seccion, creada = Section.objects.get_or_create(
                    slug=slug, defaults=iniciales,
                )
                if not creada:
                    for campo, valor in identidad.items():
                        setattr(seccion, campo, valor)
                    seccion.save(update_fields=list(identidad))
                return seccion

            crear_o_actualizar('maily-academia', maily_defaults)
            longevity_section = crear_o_actualizar('longevity-360', longevity_defaults)
            crear_o_actualizar('corporativo-camsa', corporate_defaults)

            # Solo asignar cursos cuando se hayan aplicado las migraciones del app `courses`
            if sender.label != 'courses':
                return

            Course = django_apps.get_model('courses', 'Course')
            Course.objects.filter(section__isnull=True).update(section=longevity_section)

        # Registrar una única vez, sin weak ref para evitar que se pierda el handler
        post_migrate.connect(handle_post_migrate, weak=False)


