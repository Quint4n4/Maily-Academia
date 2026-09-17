"""
Materiales de apoyo en Cloudinary.

Por que no en el disco, que es donde estaban hasta el 2026-09-17: `MEDIA_ROOT`
es el sistema de archivos del contenedor y Railway lo recrea en cada despliegue.
Los PDF de los profesores desaparecian, la fila en base de datos sobrevivia, y
la descarga respondia 500 mientras el material seguia listado para el alumno.

Los avatares y las portadas ya iban a Cloudinary; esto solo acaba de mudar lo
que faltaba.

Tres cosas medidas contra la cuenta real, no leidas en la documentacion:

  - Los archivos que no son imagen ni video suben como `resource_type='raw'`.
  - Su URL publica devuelve **401**: la cuenta no entrega archivos raw por
    enlace directo. Lejos de ser un estorbo, es lo que queremos: los materiales
    son de cursos de pago y deben pasar por el permiso del backend. Por eso la
    descarga NO redirige a Cloudinary, sino que trae el archivo y lo reenvia.
  - El tope por archivo del plan Free es **10 MB** exactos (10.485.760 bytes).
    Un archivo de 11 MB responde "File size too large". `CourseMaterial`
    aceptaba 50 MB, asi que se bajo a 10: aceptar mas solo servia para que la
    subida fallara despues, con el archivo ya viajado.
"""
import os
from urllib.error import URLError, HTTPError
from urllib.request import urlopen

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings

CARPETA = 'materiales'

# Cuanto se espera a Cloudinary antes de rendirse. Sin limite, una descarga
# colgada deja ocupado un worker de gunicorn --solo hay dos-- hasta el timeout
# del proxy.
TIEMPO_LIMITE_SEGUNDOS = 30


class ErrorDeAlmacenamiento(Exception):
    """Falla al hablar con Cloudinary. La vista la traduce a una respuesta."""


def _configurar():
    url = os.environ.get('CLOUDINARY_URL') or getattr(settings, 'CLOUDINARY_URL', '')
    if not url:
        raise ErrorDeAlmacenamiento('CLOUDINARY_URL no está configurado.')
    cloudinary.config(cloudinary_url=url)


def subir_material(archivo, course_id: int) -> str:
    """Sube el archivo y devuelve su identificador en Cloudinary."""
    _configurar()
    try:
        resultado = cloudinary.uploader.upload(
            archivo,
            folder=f'{CARPETA}/curso_{course_id}',
            resource_type='raw',
            # El nombre original puede repetirse entre cursos y traer acentos o
            # espacios; que Cloudinary genere el identificador evita colisiones.
            # El nombre para el alumno se guarda aparte, en `original_filename`.
            use_filename=False,
            unique_filename=True,
        )
    except Exception as e:
        raise ErrorDeAlmacenamiento(str(e)) from e

    public_id = resultado.get('public_id')
    if not public_id:
        raise ErrorDeAlmacenamiento('Cloudinary no devolvió un identificador.')
    return public_id


def descargar_material(public_id: str) -> bytes:
    """
    Trae el archivo de Cloudinary para reenviarlo al alumno.

    Se firma la URL porque la entrega directa de archivos raw esta cerrada en la
    cuenta: sin firma, Cloudinary responde 401 tambien a esta peticion.
    """
    _configurar()
    url, _ = cloudinary.utils.cloudinary_url(
        public_id, resource_type='raw', type='upload', sign_url=True,
    )
    # `urlopen` y no `requests`: requests esta instalado, pero solo como
    # dependencia transitiva de cloudinary y sin declarar en requirements.txt.
    # Apoyarse en eso se rompe el dia que cloudinary cambie su arbol.
    try:
        with urlopen(url, timeout=TIEMPO_LIMITE_SEGUNDOS) as respuesta:
            return respuesta.read()
    except (HTTPError, URLError, OSError) as e:
        raise ErrorDeAlmacenamiento(str(e)) from e


def borrar_material(public_id: str) -> None:
    """
    Borra el archivo. Que no reviente si falla es deliberado: si el archivo ya
    no esta en Cloudinary, el material debe poder borrarse igual. Lo contrario
    deja filas imposibles de eliminar desde el panel.
    """
    if not public_id:
        return
    try:
        _configurar()
        cloudinary.uploader.destroy(public_id, resource_type='raw')
    except Exception:  # noqa: BLE001 — ver docstring
        pass
