"""
Motor de dibujo del diploma: interpreta un `documento` y lo pinta en PDF.

Hasta la fase 0 este archivo TENIA el layout escrito dentro. Ahora el layout es
un dato --`documento.py`-- y aqui solo queda como se pinta. Es lo que permite
que un maestro mueva los elementos sin que nadie toque codigo.

Dos conversiones viven aqui y en ningun otro sitio:

1. **Origen.** El documento cuenta en milimetros desde la esquina SUPERIOR
   izquierda, como el navegador y como Canva. ReportLab cuenta en puntos desde
   la esquina INFERIOR izquierda. Si esta conversion se reparte entre el
   frontend y el backend, un dia difieren y nadie sabe cual de los dos tiene
   razon.
2. **Linea base del texto.** `y` es el borde superior del texto, no su linea
   base. Se baja usando el ascendente real de la fuente
   (`pdfmetrics.getAscent`), no una aproximacion: con un titulo a 22 pt, un
   ascendente estimado a ojo descuadra el renglon un milimetro largo.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas as reportlab_canvas

from .documento import FUENTES, PAGINAS, documento_semilla

# Fondo por defecto cuando el documento no trae uno propio: un PNG a pagina
# completa, o None para dejar el papel en blanco con su marco.
#
# Debe venir SIN texto. Es el error que tenia la plantilla anterior: traia el
# parrafo quemado en el pixel y habia que taparlo con un rectangulo blanco.
RUTA_FONDO: Path | None = None

# Marco dibujado cuando no hay imagen de fondo.
AZUL_MARCO = (0.118, 0.251, 0.686)
DORADO_MARCO = (0.518, 0.329, 0.000)


@dataclass(frozen=True)
class DatosDelDiploma:
    """Lo que se imprime. Todo llega resuelto: aqui no se consulta la base."""

    alumno: str
    curso: str
    maestro: str
    academia: str
    fecha: str
    codigo: str
    url_de_verificacion: str

    def como_diccionario(self) -> dict:
        return {
            'alumno': self.alumno,
            'curso': self.curso,
            'maestro': self.maestro,
            'academia': self.academia,
            'fecha': self.fecha,
            'codigo': self.codigo,
        }


# ---------------------------------------------------------------------------
# Utilidades de texto
# ---------------------------------------------------------------------------


def _color(codigo, por_defecto=(0, 0, 0)):
    """'#1e40af' -> (0.117, 0.251, 0.686)."""
    if not isinstance(codigo, str) or not codigo.startswith('#') or len(codigo) != 7:
        return por_defecto
    return tuple(int(codigo[i:i + 2], 16) / 255 for i in (1, 3, 5))


def _tamano_que_cabe(pdf, texto, fuente, tamano_max, ancho_max, tamano_min=10):
    """Baja el tamano de letra hasta que el texto quepa en `ancho_max`.

    Sin esto, un nombre como "Maria Fernanda de la Concepcion Rodriguez Sanchez"
    se sale del marco y toca los bordes del diploma.

    Limitacion declarada: se para en `tamano_min`. Con un ancho imposible el
    texto desborda en vez de volverse ilegible.
    """
    tamano = tamano_max
    while tamano > tamano_min and pdf.stringWidth(texto, fuente, tamano) > ancho_max:
        tamano -= 1
    return tamano


def _partir_en_lineas(pdf, texto, fuente, tamano, ancho_max, max_lineas=2):
    """Parte el texto en lineas que quepan en `ancho_max`, por palabras.

    Si no cabe en `max_lineas`, la ultima se recorta con puntos suspensivos: es
    preferible a que el titulo de un curso invada la zona de la firma.
    """
    palabras = texto.split()
    lineas: list[str] = []
    actual = ''

    for palabra in palabras:
        tentativa = f'{actual} {palabra}'.strip()
        if pdf.stringWidth(tentativa, fuente, tamano) <= ancho_max:
            actual = tentativa
            continue
        if actual:
            lineas.append(actual)
        actual = palabra
        if len(lineas) == max_lineas:
            break

    if actual and len(lineas) < max_lineas:
        lineas.append(actual)

    if not lineas:
        return ['']

    consumido = ' '.join(lineas)
    if consumido != texto.strip():
        ultima = lineas[-1]
        while ultima and pdf.stringWidth(f'{ultima}…', fuente, tamano) > ancho_max:
            ultima = ultima[:-1]
        lineas[-1] = f'{ultima}…'

    return lineas


def _rellenar_marcadores(plantilla: str, campos: dict) -> str:
    """'impartido por {maestro}' -> 'impartido por Maria Garcia'.

    Reemplazo literal y no `str.format`: el maestro escribe este texto y una
    llave suelta --"{" en "horario {tarde}"-- reventaria la emision del diploma
    con un KeyError, en la descarga del alumno y no en el editor.

    Un marcador cuyo valor esta vacio se borra junto con los espacios que lo
    rodean: `Course.section` admite null, y "impartido por Ana  ·  " con el
    separador colgando se ve peor que sin academia.
    """
    texto = plantilla
    for nombre, valor in campos.items():
        texto = texto.replace('{' + nombre + '}', valor or '')

    if any(not (campos.get(nombre) or '') for nombre in campos):
        # Limpieza de separadores que se quedaron sin uno de sus dos lados.
        for separador in ('  ·  ', ' · ', ' — ', ' - '):
            texto = texto.strip()
            if texto.startswith(separador.strip()):
                texto = texto[len(separador.strip()):]
            if texto.endswith(separador.strip()):
                texto = texto[:-len(separador.strip())]

    return ' '.join(texto.split())


def _escribir(pdf, texto, x_mm, y_mm, ancho_mm, fuente, tamano, align, espaciado=0):
    """Escribe una linea ya resuelta, convirtiendo el origen."""
    _, alto_pagina = PAGINAS['a4-horizontal']
    ascendente = pdfmetrics.getAscent(fuente, tamano)
    y = (alto_pagina - y_mm) * mm - ascendente

    if espaciado:
        ancho_texto = pdf.stringWidth(texto, fuente, tamano) + espaciado * (len(texto) - 1)
        if align == 'center':
            x = (x_mm + ancho_mm / 2) * mm - ancho_texto / 2
        elif align == 'right':
            x = (x_mm + ancho_mm) * mm - ancho_texto
        else:
            x = x_mm * mm
        pdf.setFont(fuente, tamano)
        for letra in texto:
            pdf.drawString(x, y, letra)
            x += pdf.stringWidth(letra, fuente, tamano) + espaciado
        return

    pdf.setFont(fuente, tamano)
    if align == 'center':
        pdf.drawCentredString((x_mm + ancho_mm / 2) * mm, y, texto)
    elif align == 'right':
        pdf.drawRightString((x_mm + ancho_mm) * mm, y, texto)
    else:
        pdf.drawString(x_mm * mm, y, texto)


# ---------------------------------------------------------------------------
# Los tipos de elemento
# ---------------------------------------------------------------------------


def _pintar_texto(pdf, elemento, texto):
    if not texto:
        return

    fuente = FUENTES[elemento.get('fuente', 'sans')]
    ancho_mm = elemento['ancho']
    ancho_pt = ancho_mm * mm
    tamano = elemento.get('tamano', 12)

    if elemento.get('mayusculas'):
        texto = texto.upper()

    max_lineas = elemento.get('max_lineas', 1)

    if elemento.get('autoajuste'):
        tamano = _tamano_que_cabe(pdf, texto, fuente, tamano, ancho_pt, max(tamano * 0.55, 6))

    lineas = (
        _partir_en_lineas(pdf, texto, fuente, tamano, ancho_pt, max_lineas)
        if max_lineas > 1
        else [texto]
    )

    pdf.setFillColorRGB(*_color(elemento.get('color', '#000000')))
    y = elemento['y']
    for linea in lineas:
        _escribir(
            pdf, linea, elemento['x'], y, ancho_mm,
            fuente, tamano, elemento.get('align', 'left'),
            elemento.get('espaciado', 0),
        )
        y += (tamano * 1.25) / mm


def _pintar_linea(pdf, elemento):
    _, alto_pagina = PAGINAS['a4-horizontal']
    y = (alto_pagina - elemento['y']) * mm
    pdf.setStrokeColorRGB(*_color(elemento.get('color', '#000000')))
    pdf.setLineWidth(elemento.get('grosor', 0.8))
    pdf.line(elemento['x'] * mm, y, (elemento['x'] + elemento['ancho']) * mm, y)


def _pintar_qr(pdf, elemento, url):
    _, alto_pagina = PAGINAS['a4-horizontal']
    lado = elemento['ancho'] * mm
    x = elemento['x'] * mm
    y = (alto_pagina - elemento['y'] - elemento['ancho']) * mm

    widget = qr.QrCodeWidget(url or ' ')
    x1, y1, x2, y2 = widget.getBounds()
    dibujo = Drawing(lado, lado, transform=[lado / (x2 - x1), 0, 0, lado / (y2 - y1), 0, 0])
    dibujo.add(widget)
    dibujo.drawOn(pdf, x, y)


def _pintar_sello(pdf, elemento):
    """Sello circular. Sin el, la mitad inferior del diploma queda vacia."""
    _, alto_pagina = PAGINAS['a4-horizontal']
    radio = elemento['ancho'] * mm / 2
    centro_x = elemento['x'] * mm + radio
    centro_y = (alto_pagina - elemento['y']) * mm - radio
    color = _color(elemento.get('color', '#845400'))

    pdf.setStrokeColorRGB(*color)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setLineWidth(1.6)
    pdf.circle(centro_x, centro_y, radio, stroke=1, fill=1)

    pdf.setLineWidth(0.6)
    pdf.circle(centro_x, centro_y, radio - 1.8 * mm, stroke=1, fill=0)

    pdf.setFillColorRGB(*color)
    pdf.setFont('Helvetica-Bold', 13)
    pdf.drawCentredString(centro_x, centro_y - 1.5 * mm, elemento.get('contenido', ''))

    pdf.setFont('Helvetica', 5.2)
    pdf.drawCentredString(centro_x, centro_y + 4 * mm, 'ACADEMY')


def _pintar_imagen(pdf, elemento, resolver_recurso):
    """Logo, firma o sello subido. `resolver_recurso` devuelve una ruta o None.

    Se inyecta en vez de consultarse aqui para que este modulo no dependa de la
    base ni haga peticiones de red: una descarga de Cloudinary dentro de la
    peticion, con dos workers de gunicorn, es un worker bloqueado por cada
    diploma que alguien pida mientras la red va lenta.
    """
    if resolver_recurso is None:
        return
    ruta = resolver_recurso(elemento.get('recurso_id'))
    if not ruta:
        return

    _, alto_pagina = PAGINAS['a4-horizontal']
    alto = elemento.get('alto', elemento['ancho'])
    pdf.drawImage(
        str(ruta),
        elemento['x'] * mm,
        (alto_pagina - elemento['y'] - alto) * mm,
        width=elemento['ancho'] * mm,
        height=alto * mm,
        preserveAspectRatio=True,
        mask='auto',
        anchor='c',
    )


def _pintar_fondo(pdf, documento, ancho, alto, resolver_recurso):
    fondo = documento.get('fondo')
    ruta = None

    if isinstance(fondo, dict) and resolver_recurso is not None:
        ruta = resolver_recurso(fondo.get('recurso_id'))
    elif RUTA_FONDO is not None and Path(RUTA_FONDO).exists():
        ruta = RUTA_FONDO

    if ruta:
        pdf.drawImage(str(ruta), 0, 0, width=ancho, height=alto,
                      preserveAspectRatio=True, mask='auto')
        return

    pdf.setFillColorRGB(1, 1, 1)
    pdf.rect(0, 0, ancho, alto, fill=1, stroke=0)

    pdf.setStrokeColorRGB(*AZUL_MARCO)
    pdf.setLineWidth(3)
    pdf.rect(10 * mm, 10 * mm, ancho - 20 * mm, alto - 20 * mm, fill=0, stroke=1)

    pdf.setStrokeColorRGB(*DORADO_MARCO)
    pdf.setLineWidth(0.8)
    pdf.rect(13 * mm, 13 * mm, ancho - 26 * mm, alto - 26 * mm, fill=0, stroke=1)

    for x, y in (
        (13 * mm, 13 * mm),
        (ancho - 15 * mm, 13 * mm),
        (13 * mm, alto - 15 * mm),
        (ancho - 15 * mm, alto - 15 * mm),
    ):
        pdf.setFillColorRGB(*DORADO_MARCO)
        pdf.rect(x, y, 2 * mm, 2 * mm, fill=1, stroke=0)


# ---------------------------------------------------------------------------
# Entrada publica
# ---------------------------------------------------------------------------


def dibujar_diploma(destino, datos: DatosDelDiploma, documento=None, *, resolver_recurso=None):
    """Escribe el PDF en `destino`, siguiendo `documento`.

    Sin `documento` usa la plantilla semilla, que es el diploma que la
    plataforma emite hoy.
    """
    documento = documento or documento_semilla()
    ancho_mm, alto_mm = PAGINAS.get(documento.get('pagina'), PAGINAS['a4-horizontal'])
    ancho, alto = ancho_mm * mm, alto_mm * mm

    pdf = reportlab_canvas.Canvas(destino, pagesize=(ancho, alto))
    pdf.setTitle(f'Diploma - {datos.alumno}')
    pdf.setAuthor('ACADEMY360')
    pdf.setSubject(datos.curso)

    _pintar_fondo(pdf, documento, ancho, alto, resolver_recurso)

    campos = datos.como_diccionario()
    elementos = sorted(documento.get('elementos', []), key=lambda e: e.get('z', 0))

    for elemento in elementos:
        tipo = elemento.get('tipo')
        if tipo == 'campo':
            _pintar_texto(pdf, elemento, campos.get(elemento.get('campo'), ''))
        elif tipo == 'texto':
            _pintar_texto(pdf, elemento, _rellenar_marcadores(elemento.get('contenido', ''), campos))
        elif tipo == 'linea':
            _pintar_linea(pdf, elemento)
        elif tipo == 'qr':
            _pintar_qr(pdf, elemento, datos.url_de_verificacion)
        elif tipo == 'sello':
            _pintar_sello(pdf, elemento)
        elif tipo == 'imagen':
            _pintar_imagen(pdf, elemento, resolver_recurso)

    pdf.showPage()
    pdf.save()
