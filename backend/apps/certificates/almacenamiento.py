"""
Imagenes de los diplomas --marcos, logos y sellos-- en Cloudinary.

Hermano de `apps/courses/almacenamiento.py`, con dos diferencias que importan:

- Suben como `resource_type='image'` y no `raw`, asi que Cloudinary SI las
  entrega por enlace directo. Para un marco decorativo eso esta bien; es la
  razon de que las firmas manuscritas queden fuera de esta fase (ver
  `TIPOS_PERMITIDOS`).
- Para dibujarlas en el PDF hay que traerlas al servidor. Eso es una peticion
  de red dentro de la peticion del alumno, con dos workers de gunicorn, asi que
  se guarda una copia en disco la primera vez y las siguientes descargas la
  leen de ahi.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from PIL import Image, UnidentifiedImageError

CARPETA = 'diplomas'
TIEMPO_LIMITE_SEGUNDOS = 15

# 5 MB. Un marco es una imagen de fondo, no una fotografia: a 150 dpi una A4
# horizontal cabe de sobra. Y cada diploma emitido carga con el peso del marco,
# que lo descarga el alumno desde el celular.
PESO_MAXIMO = 5 * 1024 * 1024

# 40 millones de pixeles, unas siete veces una A4 a 300 dpi. El limite de peso
# NO basta: un PNG de 3 MB puede descomprimirse a 50.000 x 50.000 px y tumbar el
# worker antes de que nadie mire su tamano. Es la "bomba de descompresion".
PIXELES_MAXIMOS = 40_000_000

# Lista blanca por lo que la imagen ES, no por como se llama.
#
# SVG no esta y no debe estar: admite `<script>` dentro y seria XSS el dia que
# el editor lo muestre en linea. Que Pillow ni siquiera lo abra es la segunda
# defensa, no la primera.
FORMATOS_PERMITIDOS = {'PNG', 'JPEG', 'WEBP'}

EXTENSIONES = {'PNG': '.png', 'JPEG': '.jpg', 'WEBP': '.webp'}


class ErrorDeImagen(Exception):
    """La imagen no sirve. La vista la traduce a un 400 con su motivo."""


class ErrorDeAlmacenamiento(Exception):
    """Falla al hablar con Cloudinary."""


def _configurar():
    url = os.environ.get('CLOUDINARY_URL') or getattr(settings, 'CLOUDINARY_URL', '')
    if not url:
        raise ErrorDeAlmacenamiento('CLOUDINARY_URL no está configurado.')
    cloudinary.config(cloudinary_url=url)


def validar_imagen(archivo) -> tuple[int, int]:
    """Comprueba que el archivo sea de verdad una imagen admitida.

    Devuelve `(ancho_px, alto_px)` o levanta `ErrorDeImagen`.

    **No se mira la extension ni el `Content-Type`**: los dos los manda el
    cliente y los dos se falsifican escribiendo. Se abre el archivo y se mira
    lo que es.
    """
    tamano = getattr(archivo, 'size', None)
    if tamano is not None and tamano > PESO_MAXIMO:
        megas = PESO_MAXIMO // (1024 * 1024)
        raise ErrorDeImagen(f'La imagen pasa de {megas} MB.')

    try:
        archivo.seek(0)
    except (AttributeError, OSError):
        pass

    # `MAX_IMAGE_PIXELS` a None y el tamano comprobado a mano: con el limite
    # puesto, Pillow lanza un aviso y sigue, en vez de parar.
    limite_original = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = None
    try:
        with Image.open(archivo) as imagen:
            formato = imagen.format
            ancho, alto = imagen.size
            # `verify` detecta el archivo corrupto o truncado, que si no
            # reventaria al dibujar el PDF y no al subirlo.
            imagen.verify()
    except UnidentifiedImageError as e:
        raise ErrorDeImagen('Ese archivo no es una imagen.') from e
    except Exception as e:  # noqa: BLE001 — imagen corrupta, truncada o rara
        raise ErrorDeImagen('La imagen está dañada o incompleta.') from e
    finally:
        Image.MAX_IMAGE_PIXELS = limite_original
        try:
            archivo.seek(0)
        except (AttributeError, OSError):
            pass

    if formato not in FORMATOS_PERMITIDOS:
        permitidos = ', '.join(sorted(FORMATOS_PERMITIDOS))
        raise ErrorDeImagen(f'Formato {formato}: solo se admiten {permitidos}.')

    if ancho * alto > PIXELES_MAXIMOS:
        raise ErrorDeImagen(
            f'La imagen tiene {ancho}x{alto} píxeles, demasiados para procesarla.'
        )

    return ancho, alto


def subir_imagen(archivo, *, tipo: str, dueno_id: int | None) -> str:
    """Sube la imagen ya validada y devuelve su identificador en Cloudinary."""
    _configurar()
    carpeta = f'{CARPETA}/{tipo}'
    if dueno_id:
        carpeta = f'{carpeta}/usuario_{dueno_id}'

    try:
        resultado = cloudinary.uploader.upload(
            archivo,
            folder=carpeta,
            resource_type='image',
            use_filename=False,
            unique_filename=True,
        )
    except Exception as e:  # noqa: BLE001 — la sdk levanta de todo
        raise ErrorDeAlmacenamiento(str(e)) from e

    public_id = resultado.get('public_id')
    if not public_id:
        raise ErrorDeAlmacenamiento('Cloudinary no devolvió un identificador.')
    return public_id


def borrar_imagen(public_id: str) -> None:
    """Igual que en materiales: si ya no está en Cloudinary, la fila debe poder
    borrarse de todos modos. Lo contrario deja recursos imposibles de eliminar."""
    if not public_id:
        return
    try:
        _configurar()
        cloudinary.uploader.destroy(public_id, resource_type='image')
    except Exception:  # noqa: BLE001 — ver docstring
        pass
    _olvidar_copia(public_id)


def _carpeta_de_copias() -> Path:
    carpeta = Path(getattr(settings, 'CACHE_DE_DIPLOMAS', '')) if getattr(
        settings, 'CACHE_DE_DIPLOMAS', '') else Path(tempfile.gettempdir()) / 'diplomas'
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


def _ruta_de_copia(public_id: str) -> Path:
    # El public_id trae barras (es una ruta de carpetas en Cloudinary), asi que
    # no sirve como nombre de archivo. El hash lo aplana y de paso evita que un
    # identificador raro escriba fuera de la carpeta.
    nombre = hashlib.sha256(public_id.encode()).hexdigest()
    return _carpeta_de_copias() / nombre


def _olvidar_copia(public_id: str) -> None:
    try:
        _ruta_de_copia(public_id).unlink(missing_ok=True)
    except OSError:
        pass


def ruta_local_de(public_id: str) -> Path | None:
    """Ruta a una copia local de la imagen, bajandola si hace falta.

    Devuelve `None` si no se pudo traer. Que devuelva None y no reviente es
    deliberado: si Cloudinary esta caido, el diploma debe salir sin el marco en
    vez de no salir. Un alumno que pidio su diploma prefiere uno sencillo a un
    error.
    """
    if not public_id:
        return None

    copia = _ruta_de_copia(public_id)
    if copia.exists() and copia.stat().st_size > 0:
        return copia

    try:
        _configurar()
        url, _ = cloudinary.utils.cloudinary_url(public_id, resource_type='image')
        with urlopen(url, timeout=TIEMPO_LIMITE_SEGUNDOS) as respuesta:
            contenido = respuesta.read()
    except (ErrorDeAlmacenamiento, HTTPError, URLError, OSError):
        return None

    if not contenido:
        return None

    # Se escribe aparte y se mueve: si dos peticiones bajan la misma imagen a la
    # vez, ninguna lee un archivo a medio escribir.
    temporal = copia.with_suffix('.parcial')
    try:
        temporal.write_bytes(contenido)
        temporal.replace(copia)
    except OSError:
        return None

    return copia


def url_de(public_id: str) -> str:
    """URL publica de la imagen, para que el editor la muestre.

    Sin firmar: estas imagenes son decorativas y publicas por diseno. Es la
    razon por la que las firmas manuscritas no son un tipo admitido.
    """
    if not public_id:
        return ''
    try:
        _configurar()
        url, _ = cloudinary.utils.cloudinary_url(public_id, resource_type='image')
        return url
    except (ErrorDeAlmacenamiento, Exception):  # noqa: B014 — sin URL, el editor pinta el hueco
        return ''
