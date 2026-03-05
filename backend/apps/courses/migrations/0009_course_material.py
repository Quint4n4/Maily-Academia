from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import apps.courses.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('courses', '0008_category_and_tags'),
    ]

    operations = [
        migrations.CreateModel(
            name='CourseMaterial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='título')),
                ('description', models.TextField(blank=True, default='', verbose_name='descripción')),
                ('file', models.FileField(upload_to=apps.courses.models.course_material_upload_path, verbose_name='archivo')),
                ('file_type', models.CharField(choices=[('pdf', 'PDF'), ('pptx', 'PowerPoint (pptx)'), ('ppt', 'PowerPoint (ppt)'), ('docx', 'Word (docx)'), ('doc', 'Word (doc)'), ('xlsx', 'Excel (xlsx)'), ('xls', 'Excel (xls)'), ('image', 'Imagen'), ('other', 'Otro')], max_length=20, verbose_name='tipo de archivo')),
                ('file_size', models.PositiveIntegerField(default=0, verbose_name='tamaño (bytes)')),
                ('original_filename', models.CharField(default='', max_length=255, verbose_name='nombre original')),
                ('download_count', models.PositiveIntegerField(default=0, verbose_name='descargas')),
                ('order', models.IntegerField(default=0, verbose_name='orden')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                (
                    'course',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='materials',
                        to='courses.course',
                        verbose_name='curso',
                    ),
                ),
                (
                    'lesson',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='materials',
                        to='courses.lesson',
                        verbose_name='lección',
                    ),
                ),
                (
                    'module',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='materials',
                        to='courses.module',
                        verbose_name='módulo',
                    ),
                ),
                (
                    'uploaded_by',
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='uploaded_materials',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='subido por',
                    ),
                ),
            ],
            options={
                'verbose_name': 'material de apoyo',
                'verbose_name_plural': 'materiales de apoyo',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]
