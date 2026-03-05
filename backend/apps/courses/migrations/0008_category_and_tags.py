from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('sections', '0001_initial'),
        ('courses', '0007_course_section'),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='nombre')),
                ('slug', models.SlugField(unique=True, verbose_name='slug')),
                ('description', models.TextField(blank=True, default='', verbose_name='descripción')),
                ('icon', models.CharField(blank=True, default='', max_length=50, verbose_name='icono')),
                ('order', models.IntegerField(default=0, verbose_name='orden')),
                ('is_active', models.BooleanField(default=True, verbose_name='activa')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='creada')),
                (
                    'parent',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='children',
                        to='courses.category',
                        verbose_name='categoría padre',
                    ),
                ),
                (
                    'section',
                    models.ForeignKey(
                        blank=True,
                        help_text='Si se establece, la categoría es específica de esa sección.',
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='categories',
                        to='sections.section',
                        verbose_name='sección',
                    ),
                ),
            ],
            options={
                'verbose_name': 'categoría',
                'verbose_name_plural': 'categorías',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.AddField(
            model_name='course',
            name='category',
            field=models.ForeignKey(
                blank=True,
                help_text='Categoría principal del curso.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='courses',
                to='courses.category',
                verbose_name='categoría principal',
            ),
        ),
        migrations.AddField(
            model_name='course',
            name='tags',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista de tags adicionales para filtrado libre.',
                verbose_name='tags',
            ),
        ),
    ]

