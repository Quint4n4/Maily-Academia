# Generated manually for plan: Secciones e instructores

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_profile_city_profile_country_profile_date_of_birth_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_super_admin',
            field=models.BooleanField(default=False, verbose_name='superadministrador'),
        ),
    ]
