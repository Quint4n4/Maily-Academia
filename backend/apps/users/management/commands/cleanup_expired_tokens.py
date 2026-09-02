"""
Limpia tokens JWT expirados de la blacklist de SimpleJWT.

Uso básico:
    python manage.py cleanup_expired_tokens

Eliminar solo tokens expirados hace más de N días:
    python manage.py cleanup_expired_tokens --days 30

Solo contar sin eliminar:
    python manage.py cleanup_expired_tokens --dry-run
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Elimina tokens JWT expirados de la blacklist de SimpleJWT'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=None,
            metavar='N',
            help=(
                'Eliminar solo tokens expirados hace más de N días. '
                'Por defecto elimina todos los tokens cuya fecha de expiración ya pasó.'
            ),
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Solo contar cuántos tokens se eliminarían, sin realizar cambios.',
        )

    def handle(self, *args, **options):
        # Verificar que token_blacklist esté disponible
        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                OutstandingToken,
                BlacklistedToken,
            )
        except ImportError:
            self.stderr.write(
                self.style.ERROR(
                    'rest_framework_simplejwt.token_blacklist no está instalado o '
                    'no se encuentra en INSTALLED_APPS. '
                    'Agrega "rest_framework_simplejwt.token_blacklist" a INSTALLED_APPS '
                    'y ejecuta las migraciones correspondientes.'
                )
            )
            return

        ahora = timezone.now()
        days = options.get('days')
        dry_run = options.get('dry_run')

        # Construir filtro de fecha límite
        if days is not None:
            fecha_limite = ahora - timedelta(days=days)
            qs = OutstandingToken.objects.filter(expires_at__lt=fecha_limite)
            descripcion_filtro = f'expirados hace más de {days} día(s)'
        else:
            qs = OutstandingToken.objects.filter(expires_at__lt=ahora)
            descripcion_filtro = 'expirados (cualquier fecha anterior a ahora)'

        total = qs.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'[dry-run] Se encontraron {total} token(s) {descripcion_filtro}. '
                    'No se realizaron cambios.'
                )
            )
            return

        if total == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'No se encontraron tokens {descripcion_filtro}. Nada que limpiar.'
                )
            )
            return

        # Eliminar en cascada (BlacklistedToken se elimina automáticamente por CASCADE)
        eliminados, _ = qs.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Se eliminaron {eliminados} token(s) JWT {descripcion_filtro}.'
            )
        )
