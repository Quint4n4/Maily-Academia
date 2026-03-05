from django.core.management.base import BaseCommand

from apps.courses.management.commands.seed_data import Command as SeedDataCommand


class Command(BaseCommand):
    help = 'Seed de datos de prueba para la academia multi-sección (wrapper de seed_data).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Eliminar datos de seed existentes antes de insertar de nuevo',
        )

    def handle(self, *args, **options):
        seed_command = SeedDataCommand()
        seed_command.stdout = self.stdout
        seed_command.stderr = self.stderr
        seed_command.handle(*args, **options)

