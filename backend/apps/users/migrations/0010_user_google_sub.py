"""
Guarda el identificador de Google del usuario.

Escrita a mano --no con `makemigrations`-- porque en este repo las migraciones
las genera y las aplica Emanuel. Se comprueba que coincide con lo que Django
generaria con `makemigrations --check --dry-run`, que no escribe nada.

Es aditiva y sin riesgo sobre datos existentes: la columna nace NULL para todas
las filas de hoy, y NULL no choca con la restriccion unica porque Postgres
admite tantos NULL como quieras en una columna UNIQUE.

Se guarda el `sub` del token y no el correo: el correo el usuario puede
cambiarlo en su cuenta de Google, el `sub` no.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_registro_de_auditoria'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='google_sub',
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
                unique=True,
                verbose_name='identificador de Google',
            ),
        ),
    ]
