# Generated manually for Fase 7 - UserActivity

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('progress', '0004_lessonprogress_video_position_seconds'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=50, verbose_name='acción')),
                ('resource_type', models.CharField(max_length=50, verbose_name='tipo de recurso')),
                ('resource_id', models.PositiveIntegerField(blank=True, null=True, verbose_name='ID del recurso')),
                ('metadata', models.JSONField(blank=True, default=dict, verbose_name='metadata')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='fecha')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'actividad de usuario',
                'verbose_name_plural': 'actividades de usuario',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='useractivity',
            index=models.Index(fields=['user', '-created_at'], name='progress_use_user_id_0b0b0d_idx'),
        ),
        migrations.AddIndex(
            model_name='useractivity',
            index=models.Index(fields=['action', '-created_at'], name='progress_use_action_1a2b3c_idx'),
        ),
    ]
