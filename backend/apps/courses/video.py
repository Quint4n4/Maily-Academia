"""
URLs de reproduccion de video.

El modelo ya soportaba varios proveedores, pero `VideoPreview.jsx` ponia la URL
directa como `src` del iframe para todos salvo YouTube. Una URL directa sin
firmar es publica para cualquiera que la tenga: con videos de YouTube publicos
eso da igual, con los videos reales de un cliente no.

Aqui se firma la URL de Bunny Stream en el servidor. La clave nunca sale de
aqui: si viajara al navegador, cualquiera podria firmarse sus propias URLs.

Formato de la firma, segun la documentacion de Bunny consultada el 2026-09-07:

    token   = SHA256_HEX(clave_de_seguridad + video_id + expires)
    url     = https://iframe.mediadelivery.net/embed/{libreria}/{video_id}
              ?token={token}&expires={expires}
    expires = marca de tiempo UNIX en SEGUNDOS

Ver docs/06-plan-de-correcciones.md, sesion 7.
"""
import hashlib
import time

from django.conf import settings

# Cuanto vale una URL firmada. Corta a proposito: la firma no impide compartir
# el video mientras dure, solo impide el acceso permanente y la indexacion. Diez
# minutos alcanzan de sobra para empezar a reproducir, y el reproductor pide una
# nueva si hace falta.
VIGENCIA_POR_DEFECTO = 600

BASE_EMBED_BUNNY = 'https://iframe.mediadelivery.net/embed'


class VideoNoConfigurado(RuntimeError):
    """El proveedor pedido no tiene sus credenciales puestas en el entorno."""


def firmar_embed_bunny(video_id, vigencia=VIGENCIA_POR_DEFECTO):
    """
    Devuelve la URL de reproduccion firmada para un video de Bunny Stream.

    `video_id` es el identificador del video en la libreria, no una URL.
    """
    libreria = getattr(settings, 'BUNNY_STREAM_LIBRARY_ID', '')
    clave = getattr(settings, 'BUNNY_STREAM_TOKEN_KEY', '')

    if not libreria or not clave:
        raise VideoNoConfigurado(
            'Faltan BUNNY_STREAM_LIBRARY_ID o BUNNY_STREAM_TOKEN_KEY en el entorno.'
        )

    expira = int(time.time()) + int(vigencia)
    firma = hashlib.sha256(f'{clave}{video_id}{expira}'.encode()).hexdigest()

    return f'{BASE_EMBED_BUNNY}/{libreria}/{video_id}?token={firma}&expires={expira}'


def url_de_reproduccion(leccion, vigencia=VIGENCIA_POR_DEFECTO):
    """
    URL con la que el reproductor puede mostrar esta leccion.

    YouTube se devuelve tal cual: son videos publicos y firmarlos no aporta nada.
    Bunny se firma. Los demas proveedores todavia no estan implementados y se
    dicen en voz alta en lugar de devolver una URL que no funcionaria.
    """
    proveedor = (leccion.video_provider or 'youtube').lower()
    referencia = (leccion.video_url or '').strip()

    if not referencia:
        return None

    if proveedor == 'youtube':
        return referencia

    if proveedor == 'bunny':
        # En Bunny se guarda el id del video, no una URL. Si alguien pego una
        # URL completa, se toma el ultimo segmento.
        video_id = referencia.rstrip('/').split('/')[-1].split('?')[0]
        return firmar_embed_bunny(video_id, vigencia)

    raise VideoNoConfigurado(
        f'El proveedor de video "{proveedor}" todavia no tiene firma implementada.'
    )
