"""
Solo puede existir un superadministrador.

Escrita a mano --no con `makemigrations`-- porque en este repo las migraciones
las genera y las aplica Emanuel. Se comprueba que coincide con lo que Django
generaria usando `makemigrations --check --dry-run`, que no escribe nada.

Es un indice unico PARCIAL: solo cubre las filas con `is_super_admin = true`.
Sin la condicion, un indice unico sobre un booleano dejaria como mucho un
usuario con false y otro con true, es decir, dos usuarios en toda la tabla.

Antes de aplicarla hay que tener como mucho UNA fila con el flag activo. El
2026-09-18 no habia ninguna, ni en local ni en produccion:

    User.objects.filter(is_super_admin=True).count()  ->  0

Si algun dia hubiera varias, la migracion falla al crear el indice y no deja la
tabla a medias; habria que decidir cual se queda antes de reintentar.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_user_google_sub'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                condition=models.Q(('is_super_admin', True)),
                fields=('is_super_admin',),
                name='solo_un_superadministrador',
            ),
        ),
    ]
