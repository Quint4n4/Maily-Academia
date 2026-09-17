"""
Los materiales de apoyo pasan del disco del contenedor a Cloudinary.

Por que: `MEDIA_ROOT` es el sistema de archivos del contenedor y Railway lo
recrea en cada despliegue. Los PDF subidos por los profesores desaparecian, la
fila en base de datos sobrevivia, y la descarga respondia 500 mientras el
material seguia apareciendo en la lista del alumno.

Es una migracion aditiva y reversible: no toca ni una fila existente. Los
materiales antiguos conservan su `file` y se siguen sirviendo del disco --si el
archivo todavia esta ahi--; los nuevos usan `cloudinary_public_id`.
"""
import apps.courses.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0009_course_material'),
    ]

    operations = [
        migrations.AddField(
            model_name='coursematerial',
            name='cloudinary_public_id',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Vacio en los materiales antiguos, que siguen en el disco del servidor.',
                max_length=255,
                verbose_name='identificador en Cloudinary',
            ),
        ),
        migrations.AlterField(
            model_name='coursematerial',
            name='file',
            field=models.FileField(
                blank=True,
                upload_to=apps.courses.models.course_material_upload_path,
                verbose_name='archivo',
            ),
        ),
    ]
