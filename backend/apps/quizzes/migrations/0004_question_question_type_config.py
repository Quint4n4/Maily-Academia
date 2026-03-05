# Generated manually for Fase 5 - Quizzes interactivos

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quizzes', '0003_add_final_evaluation_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='question_type',
            field=models.CharField(
                choices=[
                    ('multiple_choice', 'Opción múltiple'),
                    ('word_order', 'Ordenar palabras'),
                    ('word_search', 'Sopa de letras'),
                    ('crossword', 'Crucigrama'),
                    ('matching', 'Relacionar columnas'),
                    ('fill_blank', 'Llenar espacios'),
                ],
                default='multiple_choice',
                max_length=20,
                verbose_name='tipo de pregunta',
            ),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='question',
            name='config',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Config específica del tipo (word_order: items, correct_order; matching: pairs; etc.)',
                verbose_name='configuración',
            ),
        ),
        migrations.AlterField(
            model_name='question',
            name='correct_answer',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Índice base-0 de la opción correcta (multiple_choice)',
                null=True,
                verbose_name='índice de respuesta correcta',
            ),
        ),
        migrations.AlterField(
            model_name='question',
            name='options',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista de opciones (para multiple_choice). Array JSON.',
                verbose_name='opciones',
            ),
        ),
    ]
