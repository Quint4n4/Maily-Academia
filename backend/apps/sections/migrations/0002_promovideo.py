# Generated manually for plan: Secciones e instructores (videos de prueba Maily)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sections', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PromoVideo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='título')),
                ('description', models.TextField(blank=True, default='', verbose_name='descripción')),
                ('embed_url', models.URLField(help_text='URL del embed (YouTube, Vimeo, etc.)', max_length=500, verbose_name='URL del embed (YouTube, Vimeo, etc.)')),
                ('duration', models.CharField(blank=True, default='', help_text='Ej: "3 min"', max_length=20, verbose_name='duración')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='orden')),
                ('is_active', models.BooleanField(default=True, verbose_name='activo')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='actualizado')),
                ('section', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='promo_videos', to='sections.section', verbose_name='sección')),
            ],
            options={
                'verbose_name': 'video de promoción',
                'verbose_name_plural': 'videos de promoción',
                'ordering': ['section', 'order', 'id'],
            },
        ),
    ]
