"""
El diploma emitido congela tambien su diseno, no solo sus textos.

El relleno de abajo toca los diplomas que YA estaban emitidos. Como en la
migracion 0004, no hay forma de saber que aspecto tenian el dia que se
emitieron --esa informacion no se guardo nunca-- asi que se les escribe el
diseno que su curso usa hoy. Es lo mejor disponible y deja de empeorar.
"""

from django.db import migrations, models


def congelar_el_diseno_de_los_ya_emitidos(apps, schema_editor):
    from apps.certificates.documento import documento_semilla

    Certificate = apps.get_model('certificates', 'Certificate')

    # La semilla se pide una vez y se copia: `documento_semilla()` ya devuelve
    # una copia profunda, pero llamarla por cada certificado en una base con
    # miles seria gratuito solo en la factura.
    semilla = documento_semilla()

    pendientes = []
    consulta = Certificate.objects.select_related('course__plantilla_de_diploma')

    for certificado in consulta.iterator():
        if certificado.documento_congelado:
            continue
        plantilla = getattr(certificado.course, 'plantilla_de_diploma', None)
        certificado.documento_congelado = (
            plantilla.documento if plantilla and plantilla.documento
            else {**semilla, 'elementos': [dict(e) for e in semilla['elementos']]}
        )
        pendientes.append(certificado)

        if len(pendientes) >= 200:
            Certificate.objects.bulk_update(pendientes, ['documento_congelado'])
            pendientes = []

    if pendientes:
        Certificate.objects.bulk_update(pendientes, ['documento_congelado'])


def descongelar(apps, schema_editor):
    """Al revertir no hay nada que deshacer: la columna se va con RemoveField."""


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0006_recurso_de_diploma'),
        # El relleno de abajo lee `course.plantilla_de_diploma`, que crea esta
        # migracion de OTRA app. Sin declararlo, Django es libre de ejecutar
        # esta antes, y entonces el campo no existe todavia: `migrate` revienta
        # y el contenedor no llega a arrancar.
        #
        # No se noto en los tests porque pytest corre con --reuse-db sobre una
        # base donde las migraciones ya estaban aplicadas en el orden en que se
        # escribieron. Desde cero, que es lo que pasa en un despliegue, el
        # orden lo decide el grafo.
        ('courses', '0011_plantilla_de_diploma_en_curso'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='documento_congelado',
            field=models.JSONField(blank=True, default=None, null=True, verbose_name='diseño congelado'),
        ),
        migrations.RunPython(congelar_el_diseno_de_los_ya_emitidos, descongelar),
    ]
