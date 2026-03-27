"""
Marca como inactivas las membresías de sección cuya fecha de expiración ya pasó.

Uso básico:
    python manage.py cleanup_expired_memberships

Solo contar sin modificar:
    python manage.py cleanup_expired_memberships --dry-run
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.sections.models import SectionMembership


class Command(BaseCommand):
    help = 'Marca como inactivas las membresías de sección cuya fecha de expiración ya pasó'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Solo contar cuántas membresías se actualizarían, sin realizar cambios.',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run')
        ahora = timezone.now()

        # Membresías que están activas pero cuya fecha de expiración ya pasó
        qs = SectionMembership.objects.filter(
            is_active=True,
            expires_at__isnull=False,
            expires_at__lt=ahora,
        )

        total = qs.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'[dry-run] Se encontraron {total} membresía(s) expirada(s) aún activas. '
                    'No se realizaron cambios.'
                )
            )
            return

        if total == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    'No se encontraron membresías expiradas activas. Nada que limpiar.'
                )
            )
            return

        actualizadas = qs.update(is_active=False)

        self.stdout.write(
            self.style.SUCCESS(
                f'Se marcaron como inactivas {actualizadas} membresía(s) de sección expirada(s).'
            )
        )
