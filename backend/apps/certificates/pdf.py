"""
Dibujo del diploma en PDF.

Un solo formato para las tres academias. Lo unico que cambia entre un diploma y
otro son las cinco variables que trae `DatosDelDiploma`: alumno, curso, maestro,
academia y fecha -- mas el codigo de verificacion.

Por que se dibuja por codigo y no sobre una imagen: la plantilla anterior
(`static/certificates/maily_template.png`) traia el parrafo quemado en el pixel
--"Capacitacion 360 de Maily Soft... exponenciar tu consultorio"-- asi que la
vista tenia que pintarle encima un rectangulo blanco y reescribir el texto. El
parche se notaba porque el fondo de esa zona es un degradado, no blanco. Y el
sello decia Maily Soft, que es otro producto.

Si algun dia hay arte propio de Academy360, se pone en `RUTA_FONDO` y este
modulo lo usa de fondo a pagina completa en vez de dibujar el marco. Las
posiciones del texto no cambian.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as reportlab_canvas

# --------------------------------------------------------------------------
# Lo que se cambia sin tocar el resto del archivo
# --------------------------------------------------------------------------

MARCA = 'ACADEMY360'
TITULO = 'CERTIFICADO DE FINALIZACIÓN'

# Quien firma la plataforma. Con las dos cadenas vacias no se imprime nada bajo
# la linea de firma, que es como queda hasta que Emanuel diga el nombre y el
# cargo. La linea se dibuja igual: un diploma sin espacio de firma se ve
# incompleto, uno con la linea vacia se ve como lo que es, pendiente de firmar.
FIRMANTE_NOMBRE = ''
FIRMANTE_CARGO = ''

# PNG con fondo transparente de la firma manuscrita, o None. Se dibuja sobre la
# linea de firma. Ojo: una firma escaneada dentro de un PDF que el alumno
# descarga es una firma que cualquiera puede recortar y reusar.
RUTA_FIRMA: Path | None = None

# PNG de fondo a pagina completa, o None para dibujar el marco por codigo. Si se
# pone, debe venir SIN texto: los textos los escribe este modulo.
#
# Es EL error que tenia la plantilla anterior: traia el parrafo quemado en el
# pixel y la vista tenia que taparlo con un rectangulo blanco. Un fondo
# exportado de Canva con "Otorgado a" y un nombre de ejemplo repite esa historia.
RUTA_FONDO: Path | None = None

# El sello circular dorado del centro. Se apaga cuando el fondo propio ya trae
# medalla: dos sellos superpuestos se ven peor que ninguno.
DIBUJAR_SELLO = True

# Paleta, tomada de cursos-maily/tailwind.config.js para que el diploma y la
# plataforma sean el mismo color: maily.dark (#1e40af) y stitch-primary (#845400).
AZUL = (0.118, 0.251, 0.686)
DORADO = (0.518, 0.329, 0.000)
TINTA = (0.106, 0.110, 0.098)
GRIS = (0.361, 0.357, 0.353)
BLANCO = (1, 1, 1)

# Helvetica en vez de Plus Jakarta Sans: las Type1 base de PDF no hay que
# empaquetarlas ni registrarlas, y traen los acentos del espanol. Meter la
# tipografia de la marca significa subir el .ttf al repo y registrarlo al
# arrancar; se puede, pero es superficie nueva por un detalle que casi nadie
# nota en un diploma.
SANS = 'Helvetica'
SANS_BOLD = 'Helvetica-Bold'
SANS_ITALIC_BOLD = 'Helvetica-BoldOblique'


@dataclass(frozen=True)
class DatosDelDiploma:
    """Lo que se imprime. Todo llega ya resuelto: aqui no se consulta la base."""

    alumno: str
    curso: str
    maestro: str
    academia: str
    fecha: str
    codigo: str
    url_de_verificacion: str


# --------------------------------------------------------------------------
# Utilidades de texto
# --------------------------------------------------------------------------


def _tamano_que_cabe(pdf, texto, fuente, tamano_max, ancho_max, tamano_min=10):
    """Baja el tamano de letra hasta que el texto quepa en `ancho_max`.

    Sin esto, un nombre como "Maria Fernanda de la Concepcion Rodriguez Sanchez"
    se sale del marco y toca los bordes del diploma.
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

    # Quedo texto fuera: recortar la ultima linea para que se vea que sigue.
    consumido = ' '.join(lineas)
    if consumido != texto.strip():
        ultima = lineas[-1]
        while ultima and pdf.stringWidth(f'{ultima}…', fuente, tamano) > ancho_max:
            ultima = ultima[:-1]
        lineas[-1] = f'{ultima}…'

    return lineas


def _con_espaciado(pdf, texto, x_centro, y, fuente, tamano, espaciado):
    """Dibuja texto centrado con separacion extra entre letras.

    ReportLab no tiene letter-spacing; se dibuja letra por letra. Solo se usa en
    las dos lineas de arriba, que son las que piden aire de diploma.
    """
    ancho = pdf.stringWidth(texto, fuente, tamano) + espaciado * (len(texto) - 1)
    x = x_centro - ancho / 2
    pdf.setFont(fuente, tamano)
    for letra in texto:
        pdf.drawString(x, y, letra)
        x += pdf.stringWidth(letra, fuente, tamano) + espaciado


# --------------------------------------------------------------------------
# Las piezas del diploma
# --------------------------------------------------------------------------


def _dibujar_fondo(pdf, ancho, alto):
    """Marco por codigo, o el PNG de `RUTA_FONDO` si existe."""
    if RUTA_FONDO is not None and Path(RUTA_FONDO).exists():
        pdf.drawImage(
            str(RUTA_FONDO), 0, 0, width=ancho, height=alto,
            preserveAspectRatio=True, mask='auto',
        )
        return

    pdf.setFillColorRGB(*BLANCO)
    pdf.rect(0, 0, ancho, alto, fill=1, stroke=0)

    # Marco exterior azul y filete dorado por dentro.
    pdf.setStrokeColorRGB(*AZUL)
    pdf.setLineWidth(3)
    pdf.rect(10 * mm, 10 * mm, ancho - 20 * mm, alto - 20 * mm, fill=0, stroke=1)

    pdf.setStrokeColorRGB(*DORADO)
    pdf.setLineWidth(0.8)
    pdf.rect(13 * mm, 13 * mm, ancho - 26 * mm, alto - 26 * mm, fill=0, stroke=1)

    # Esquinas: cuadrados dorados pequenos que rematan el marco.
    for x, y in (
        (13 * mm, 13 * mm),
        (ancho - 15 * mm, 13 * mm),
        (13 * mm, alto - 15 * mm),
        (ancho - 15 * mm, alto - 15 * mm),
    ):
        pdf.setFillColorRGB(*DORADO)
        pdf.rect(x, y, 2 * mm, 2 * mm, fill=1, stroke=0)


def _dibujar_encabezado(pdf, ancho, alto):
    centro = ancho / 2

    pdf.setFillColorRGB(*DORADO)
    _con_espaciado(pdf, MARCA, centro, alto - 26 * mm, SANS_BOLD, 12, 3.5)

    pdf.setFillColorRGB(*AZUL)
    _con_espaciado(pdf, TITULO, centro, alto - 40 * mm, SANS_BOLD, 22, 1.5)

    pdf.setStrokeColorRGB(*DORADO)
    pdf.setLineWidth(1.2)
    pdf.line(centro - 25 * mm, alto - 45 * mm, centro + 25 * mm, alto - 45 * mm)


def _dibujar_cuerpo(pdf, datos: DatosDelDiploma, ancho, alto) -> float:
    """Dibuja el bloque central y devuelve la `y` donde termina.

    Devuelve la `y` porque el titulo del curso puede ocupar uno o dos
    renglones: lo que va debajo --el sello-- tiene que colocarse a partir de
    donde el cuerpo acabo de verdad, no de una constante que solo acierta con
    los titulos cortos.
    """
    centro = ancho / 2
    ancho_util = ancho - 60 * mm

    pdf.setFillColorRGB(*GRIS)
    pdf.setFont(SANS, 12)
    pdf.drawCentredString(centro, alto - 60 * mm, 'Otorgado a')

    tamano_nombre = _tamano_que_cabe(pdf, datos.alumno, SANS_ITALIC_BOLD, 30, ancho_util, 16)
    pdf.setFillColorRGB(*TINTA)
    pdf.setFont(SANS_ITALIC_BOLD, tamano_nombre)
    pdf.drawCentredString(centro, alto - 77 * mm, datos.alumno)

    ancho_nombre = pdf.stringWidth(datos.alumno, SANS_ITALIC_BOLD, tamano_nombre)
    media_linea = min(max(ancho_nombre / 2 + 8 * mm, 30 * mm), ancho_util / 2)
    pdf.setStrokeColorRGB(*DORADO)
    pdf.setLineWidth(0.6)
    pdf.line(centro - media_linea, alto - 82 * mm, centro + media_linea, alto - 82 * mm)

    pdf.setFillColorRGB(*GRIS)
    pdf.setFont(SANS, 12)
    pdf.drawCentredString(centro, alto - 94 * mm, 'Por haber concluido satisfactoriamente el curso')

    # El titulo del curso es la unica linea que puede ocupar dos renglones.
    tamano_curso = _tamano_que_cabe(pdf, datos.curso, SANS_BOLD, 17, ancho_util, 12)
    lineas = _partir_en_lineas(pdf, datos.curso, SANS_BOLD, tamano_curso, ancho_util)
    pdf.setFillColorRGB(*AZUL)
    pdf.setFont(SANS_BOLD, tamano_curso)
    y = alto - 105 * mm
    for linea in lineas:
        pdf.drawCentredString(centro, y, linea)
        y -= tamano_curso + 3

    # Maestro y academia: las otras dos variables, juntas en un solo renglon.
    # `Course.section` admite null, asi que la academia puede faltar y el
    # separador no debe quedar colgando.
    partes = []
    if datos.maestro:
        partes.append(f'impartido por {datos.maestro}')
    if datos.academia:
        partes.append(datos.academia)
    pie = '  ·  '.join(partes)
    tamano_pie = _tamano_que_cabe(pdf, pie, SANS, 12, ancho_util, 9) if pie else 12
    pdf.setFillColorRGB(*GRIS)
    pdf.setFont(SANS, tamano_pie)
    y -= 5
    pdf.drawCentredString(centro, y, pie)

    return y


def _dibujar_sello(pdf, ancho, y_tope):
    """Sello circular entre el cuerpo y la firma.

    No es decoracion gratuita: sin el, la mitad inferior del diploma queda
    vacia y el documento se ve cortado. `y_tope` es donde acabo el cuerpo, con
    un suelo para que un curso de dos renglones no lo empuje sobre la firma.
    """
    centro_x = ancho / 2
    centro_y = max(y_tope - 20 * mm, 62 * mm)
    radio = 11 * mm

    pdf.setStrokeColorRGB(*DORADO)
    pdf.setFillColorRGB(*BLANCO)
    pdf.setLineWidth(1.6)
    pdf.circle(centro_x, centro_y, radio, stroke=1, fill=1)

    pdf.setLineWidth(0.6)
    pdf.circle(centro_x, centro_y, radio - 1.8 * mm, stroke=1, fill=0)

    pdf.setFillColorRGB(*DORADO)
    pdf.setFont(SANS_BOLD, 13)
    pdf.drawCentredString(centro_x, centro_y - 1.5 * mm, 'A360')

    pdf.setFont(SANS, 5.2)
    pdf.drawCentredString(centro_x, centro_y + 4 * mm, 'ACADEMY')


def _dibujar_firma(pdf, ancho, alto):
    centro = ancho / 2
    y_linea = 40 * mm

    if RUTA_FIRMA is not None and Path(RUTA_FIRMA).exists():
        pdf.drawImage(
            str(RUTA_FIRMA),
            centro - 22 * mm, y_linea + 2 * mm,
            width=44 * mm, height=16 * mm,
            preserveAspectRatio=True, mask='auto', anchor='c',
        )

    pdf.setStrokeColorRGB(*TINTA)
    pdf.setLineWidth(0.8)
    pdf.line(centro - 30 * mm, y_linea, centro + 30 * mm, y_linea)

    y = y_linea - 5 * mm
    if FIRMANTE_NOMBRE:
        pdf.setFillColorRGB(*TINTA)
        pdf.setFont(SANS_BOLD, 10)
        pdf.drawCentredString(centro, y, FIRMANTE_NOMBRE)
        y -= 4.5 * mm

    if FIRMANTE_CARGO:
        pdf.setFillColorRGB(*GRIS)
        pdf.setFont(SANS, 9)
        pdf.drawCentredString(centro, y, FIRMANTE_CARGO)
        y -= 4.5 * mm

    pdf.setFillColorRGB(*GRIS)
    pdf.setFont(SANS, 8.5)
    pdf.drawCentredString(centro, y, MARCA)


def _dibujar_fecha(pdf, datos: DatosDelDiploma, alto):
    x = 25 * mm

    pdf.setFillColorRGB(*GRIS)
    pdf.setFont(SANS, 8)
    pdf.drawString(x, 42 * mm, 'FECHA DE EMISIÓN')

    pdf.setFillColorRGB(*TINTA)
    pdf.setFont(SANS_BOLD, 11)
    pdf.drawString(x, 35 * mm, datos.fecha)


def _dibujar_verificacion(pdf, datos: DatosDelDiploma, ancho):
    """QR a la pagina publica de verificacion, y el codigo escrito debajo.

    El codigo va tambien en texto porque un QR impreso en papel y fotocopiado
    deja de leerse, y porque quien reciba el diploma por correo puede preferir
    teclear. Sin esto la verificacion publica existe pero nadie puede llegar a
    ella desde el documento.
    """
    lado = 22 * mm
    x = ancho - 25 * mm - lado
    y = 32 * mm

    widget = qr.QrCodeWidget(datos.url_de_verificacion)
    x1, y1, x2, y2 = widget.getBounds()
    dibujo = Drawing(lado, lado, transform=[lado / (x2 - x1), 0, 0, lado / (y2 - y1), 0, 0])
    dibujo.add(widget)
    dibujo.drawOn(pdf, x, y)

    pdf.setFillColorRGB(*GRIS)
    pdf.setFont(SANS, 7)
    pdf.drawCentredString(x + lado / 2, y - 4 * mm, 'Verifica este diploma')

    pdf.setFont(SANS, 5.8)
    pdf.drawCentredString(x + lado / 2, y - 7 * mm, datos.codigo)


# --------------------------------------------------------------------------
# Entrada publica
# --------------------------------------------------------------------------


def dibujar_diploma(destino, datos: DatosDelDiploma) -> None:
    """Escribe el PDF del diploma en `destino` (un archivo o una HttpResponse)."""
    ancho, alto = landscape(A4)
    pdf = reportlab_canvas.Canvas(destino, pagesize=(ancho, alto))
    pdf.setTitle(f'Diploma - {datos.alumno}')
    pdf.setAuthor(MARCA)
    pdf.setSubject(datos.curso)

    _dibujar_fondo(pdf, ancho, alto)
    _dibujar_encabezado(pdf, ancho, alto)
    y_cuerpo = _dibujar_cuerpo(pdf, datos, ancho, alto)
    if DIBUJAR_SELLO:
        _dibujar_sello(pdf, ancho, y_cuerpo)
    _dibujar_firma(pdf, ancho, alto)
    _dibujar_fecha(pdf, datos, alto)
    _dibujar_verificacion(pdf, datos, ancho)

    pdf.showPage()
    pdf.save()
