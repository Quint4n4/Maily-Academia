from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_profile_department_profile_emergency_contact_name_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='avatar',
            field=models.URLField('avatar', blank=True, default='', max_length=500),
        ),
    ]
