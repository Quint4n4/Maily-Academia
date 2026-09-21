"""
El diploma pasa de ser un calculo a ser un registro.

Escrita a mano: `verificadores.migraciones: solo-emanuel` en el perfil del repo,
asi que ningun agente corre `makemigrations` ni `migrate`. Reversible: al bajar
se borran las cuatro columnas y el diploma vuelve a leer las relaciones vivas,
que es justo lo que hacia antes.

El relleno de abajo toca los diplomas que YA estaban emitidos. No hay forma de
saber como se llamaba el curso el dia que se emitieron --esa informacion no se
guardo nunca-- asi que se les escribe lo que dicen hoy. Es lo mejor disponible y
deja de empeorar: a partir de aqui, lo emitido no se mueve.
"""

from django.db import migrations, models


def _nombre(usuario):
    if usuario is None:
        return ''
    completo = f'{usuario.first_name} {usuario.last_name}'.strip()
    return completo or (usuario.username or '').strip() or (usuario.email or '').strip()


def congelar_los_ya_emitidos(apps, schema_editor):
    Certificate = apps.get_model('certificates', 'Certificate')

    pendientes = []
    consulta = Certificate.objects.select_related(
        'user', 'course', 'course__instructor', 'course__section',
    )

    for certificado in consulta.iterator():
        curso = certificado.course
        certificado.student_name = _nombre(certificado.user)[:255]
        certificado.course_title = (curso.title or '')[:255]
        certificado.instructor_name = _nombre(curso.instructor)[:255]
        certificado.section_name = (curso.section.name if curso.section_id else '')[:120]
        pendientes.append(certificado)

    if pendientes:
        Certificate.objects.bulk_update(
            pendientes,
            ['student_name', 'course_title', 'instructor_name', 'section_name'],
            batch_size=200,
        )


def descongelar(apps, schema_editor):
    """Al revertir no hay nada que deshacer: las columnas se van con RemoveField."""


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0003_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='student_name',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='nombre del alumno'),
        ),
        migrations.AddField(
            model_name='certificate',
            name='course_title',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='nombre del curso'),
        ),
        migrations.AddField(
            model_name='certificate',
            name='instructor_name',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='nombre del maestro'),
        ),
        migrations.AddField(
            model_name='certificate',
            name='section_name',
            field=models.CharField(blank=True, default='', max_length=120, verbose_name='academia'),
        ),
        migrations.RunPython(congelar_los_ya_emitidos, descongelar),
    ]
