"""
El diploma como datos: catalogo de lo que se puede poner, la plantilla semilla y
el validador.

Contrato en `docs/02-contrato-diplomas.md`. Lo que este archivo fija:

- **Milimetros, origen arriba-izquierda.** En pixeles del navegador el diploma se
  descuadra segun el monitor de quien lo edito. La conversion al origen de
  ReportLab --que cuenta desde abajo-- vive en `render.py` y en ningun otro
  sitio.
- `x`, `y` son la esquina SUPERIOR IZQUIERDA del elemento, nunca su centro. El
  texto se alinea dentro de `ancho` segun `align`.

Dos cosas que el contrato no traia y se agregan aqui, por lo que costaria
descubrirlas despues:

1. `contenido` admite marcadores: `"impartido por {maestro} · {academia}"`. Sin
   esto, el pie de la semilla necesitaria tres elementos separados y el maestro
   no podria redactar su propia frase.
2. `autoajuste` y `max_lineas`. Son lo que hace que un nombre de cincuenta
   letras no se salga del marco. Sin ellos el editor produce diplomas rotos con
   solo escribir un nombre largo.
"""

from __future__ import annotations

# Ancho y alto de la pagina en milimetros.
PAGINAS = {
    'a4-horizontal': (297.0, 210.0),
}
PAGINA_POR_DEFECTO = 'a4-horizontal'

# Catalogo cerrado de tipografias: las Type1 base de PDF. Existen en cualquier
# lector, traen los acentos del espanol y no hay que empaquetar ningun .ttf.
# Anadir una fuente de marca es subir el archivo, registrarlo al arrancar y
# servirlo al editor como webfont: es una tarea por fuente, no una opcion mas.
FUENTES = {
    'sans': 'Helvetica',
    'sans-bold': 'Helvetica-Bold',
    'sans-italic': 'Helvetica-Oblique',
    'sans-bold-italic': 'Helvetica-BoldOblique',
    'serif': 'Times-Roman',
    'serif-bold': 'Times-Bold',
    'serif-italic': 'Times-Italic',
    'mono': 'Courier',
}

# Las variables del diploma. Son las cinco que pidio Emanuel mas el codigo de
# verificacion, que se imprime para que la pagina publica sea alcanzable desde
# el papel.
CAMPOS = ('alumno', 'curso', 'maestro', 'academia', 'fecha', 'codigo')

TIPOS = ('campo', 'texto', 'imagen', 'qr', 'linea', 'sello')
ALINEACIONES = ('left', 'center', 'right')

TAMANO_MINIMO = 5
TAMANO_MAXIMO = 80
MAXIMO_DE_ELEMENTOS = 40
MAXIMO_DE_CONTENIDO = 300

# Paleta, de cursos-maily/tailwind.config.js, para que el diploma y la
# plataforma sean el mismo color.
AZUL = '#1e40af'
DORADO = '#845400'
TINTA = '#1b1c19'
GRIS = '#5c5b5a'


# ---------------------------------------------------------------------------
# La plantilla semilla
# ---------------------------------------------------------------------------

# Es la que se carga al abrir el editor por primera vez: el maestro nunca empieza
# con una hoja en blanco, mueve lo que ya esta puesto. Reproduce el diploma que
# la fase 0 dejo en produccion.
#
# `bloqueado` no impide mover ni cambiar de tamano: impide BORRAR. Sin el QR y
# sin el codigo, el diploma deja de ser verificable y la pagina publica de
# verificacion se queda sin nadie que llegue a ella.

DOCUMENTO_SEMILLA = {
    'version': 1,
    'pagina': PAGINA_POR_DEFECTO,
    'fondo': None,
    'elementos': [
        {'id': 'marca', 'tipo': 'texto', 'contenido': 'ACADEMY360',
         'x': 30, 'y': 21, 'ancho': 237,
         'fuente': 'sans-bold', 'tamano': 12, 'color': DORADO,
         'align': 'center', 'espaciado': 3.5},

        {'id': 'titulo', 'tipo': 'texto', 'contenido': 'CERTIFICADO DE FINALIZACIÓN',
         'x': 30, 'y': 32, 'ancho': 237,
         'fuente': 'sans-bold', 'tamano': 22, 'color': AZUL,
         'align': 'center', 'espaciado': 1.5},

        {'id': 'filete', 'tipo': 'linea',
         'x': 123.5, 'y': 45, 'ancho': 50, 'grosor': 1.2, 'color': DORADO},

        {'id': 'otorgado', 'tipo': 'texto', 'contenido': 'Otorgado a',
         'x': 30, 'y': 54, 'ancho': 237,
         'fuente': 'sans', 'tamano': 12, 'color': GRIS, 'align': 'center'},

        {'id': 'alumno', 'tipo': 'campo', 'campo': 'alumno',
         'x': 30, 'y': 64, 'ancho': 237,
         'fuente': 'sans-bold-italic', 'tamano': 30, 'color': TINTA,
         'align': 'center', 'autoajuste': True},

        {'id': 'raya', 'tipo': 'linea',
         'x': 78.5, 'y': 81, 'ancho': 140, 'grosor': 0.6, 'color': DORADO},

        {'id': 'leyenda', 'tipo': 'texto',
         'contenido': 'Por haber concluido satisfactoriamente el curso',
         'x': 30, 'y': 88, 'ancho': 237,
         'fuente': 'sans', 'tamano': 12, 'color': GRIS, 'align': 'center'},

        {'id': 'curso', 'tipo': 'campo', 'campo': 'curso',
         'x': 30, 'y': 97, 'ancho': 237,
         'fuente': 'sans-bold', 'tamano': 17, 'color': AZUL,
         'align': 'center', 'autoajuste': True, 'max_lineas': 2},

        {'id': 'pie', 'tipo': 'texto',
         'contenido': 'impartido por {maestro}  ·  {academia}',
         'x': 30, 'y': 110, 'ancho': 237,
         'fuente': 'sans', 'tamano': 12, 'color': GRIS,
         'align': 'center', 'autoajuste': True},

        {'id': 'sello', 'tipo': 'sello', 'contenido': 'A360',
         'x': 137.5, 'y': 122, 'ancho': 22, 'color': DORADO},

        {'id': 'firma-linea', 'tipo': 'linea',
         'x': 118.5, 'y': 168, 'ancho': 60, 'grosor': 0.8, 'color': TINTA},

        {'id': 'firma-marca', 'tipo': 'texto', 'contenido': 'ACADEMY360',
         'x': 98.5, 'y': 171, 'ancho': 100,
         'fuente': 'sans', 'tamano': 8.5, 'color': GRIS, 'align': 'center'},

        {'id': 'fecha-titulo', 'tipo': 'texto', 'contenido': 'FECHA DE EMISIÓN',
         'x': 25, 'y': 164, 'ancho': 80,
         'fuente': 'sans', 'tamano': 8, 'color': GRIS, 'align': 'left'},

        {'id': 'fecha', 'tipo': 'campo', 'campo': 'fecha',
         'x': 25, 'y': 170, 'ancho': 80,
         'fuente': 'sans-bold', 'tamano': 11, 'color': TINTA, 'align': 'left'},

        {'id': 'qr', 'tipo': 'qr',
         'x': 250, 'y': 152, 'ancho': 22, 'bloqueado': True},

        {'id': 'qr-leyenda', 'tipo': 'texto', 'contenido': 'Verifica este diploma',
         'x': 231, 'y': 176, 'ancho': 60,
         'fuente': 'sans', 'tamano': 7, 'color': GRIS, 'align': 'center'},

        {'id': 'codigo', 'tipo': 'campo', 'campo': 'codigo',
         'x': 231, 'y': 180, 'ancho': 60,
         'fuente': 'sans', 'tamano': 5.8, 'color': GRIS,
         'align': 'center', 'bloqueado': True},
    ],
}


def documento_semilla() -> dict:
    """Copia profunda de la semilla, para que nadie la mute por accidente."""
    import copy

    return copy.deepcopy(DOCUMENTO_SEMILLA)


# ---------------------------------------------------------------------------
# Validador
# ---------------------------------------------------------------------------

# Que propiedades admite cada tipo, ademas de las comunes.
_PROPIEDADES_DE_TEXTO = {
    'fuente', 'tamano', 'color', 'align', 'mayusculas', 'autoajuste',
    'max_lineas', 'espaciado',
}
_COMUNES = {'id', 'tipo', 'x', 'y', 'ancho', 'z', 'bloqueado'}
_ADMITIDAS = {
    'campo': _COMUNES | _PROPIEDADES_DE_TEXTO | {'campo'},
    'texto': _COMUNES | _PROPIEDADES_DE_TEXTO | {'contenido'},
    'imagen': _COMUNES | {'recurso_id', 'alto'},
    'qr': _COMUNES,
    'linea': _COMUNES | {'grosor', 'color'},
    'sello': _COMUNES | {'contenido', 'color'},
}


def _es_numero(valor) -> bool:
    return isinstance(valor, (int, float)) and not isinstance(valor, bool)


def _es_color(valor) -> bool:
    if not isinstance(valor, str) or not valor.startswith('#'):
        return False
    cuerpo = valor[1:]
    return len(cuerpo) == 6 and all(c in '0123456789abcdefABCDEF' for c in cuerpo)


def _validar_elemento(elemento, ancho_pagina, alto_pagina, recursos_permitidos):
    """Devuelve la lista de errores de un elemento. Vacia si esta bien."""
    errores = []

    tipo = elemento.get('tipo')
    if tipo not in TIPOS:
        return [f'Tipo desconocido: {tipo!r}.']

    sobrantes = set(elemento) - _ADMITIDAS[tipo]
    if sobrantes:
        errores.append(f'Propiedades que no existen para {tipo}: {sorted(sobrantes)}.')

    for clave in ('x', 'y', 'ancho'):
        if not _es_numero(elemento.get(clave)):
            errores.append(f'{clave} debe ser un número.')

    if errores:
        return errores

    x, y, ancho = elemento['x'], elemento['y'], elemento['ancho']
    alto = elemento.get('alto', 0) if tipo == 'imagen' else 0
    if tipo in ('qr', 'sello'):
        alto = ancho

    if ancho <= 0:
        errores.append('ancho debe ser mayor que cero.')
    if tipo == 'imagen' and not (_es_numero(alto) and alto > 0):
        errores.append('alto debe ser un número mayor que cero.')

    # Fuera de la pagina. Es lo que mas se rompe al arrastrar deprisa, y si no
    # se corta aqui el elemento desaparece del PDF sin decir nada.
    if x < 0 or y < 0:
        errores.append('El elemento se sale por arriba o por la izquierda.')
    if _es_numero(ancho) and x + ancho > ancho_pagina + 0.01:
        errores.append('El elemento se sale por la derecha de la página.')
    if _es_numero(alto) and y + alto > alto_pagina + 0.01:
        errores.append('El elemento se sale por abajo de la página.')

    if tipo == 'campo' and elemento.get('campo') not in CAMPOS:
        errores.append(f'campo debe ser uno de {list(CAMPOS)}.')

    if tipo == 'texto':
        contenido = elemento.get('contenido')
        if not isinstance(contenido, str):
            errores.append('contenido debe ser texto.')
        elif len(contenido) > MAXIMO_DE_CONTENIDO:
            errores.append(f'contenido pasa de {MAXIMO_DE_CONTENIDO} caracteres.')

    if tipo in ('campo', 'texto'):
        if elemento.get('fuente') not in FUENTES:
            errores.append(f'fuente debe ser una de {sorted(FUENTES)}.')
        tamano = elemento.get('tamano')
        if not _es_numero(tamano):
            errores.append('tamano debe ser un número.')
        elif not TAMANO_MINIMO <= tamano <= TAMANO_MAXIMO:
            errores.append(f'tamano debe estar entre {TAMANO_MINIMO} y {TAMANO_MAXIMO}.')
        if elemento.get('align', 'left') not in ALINEACIONES:
            errores.append(f'align debe ser uno de {list(ALINEACIONES)}.')

    if 'color' in elemento and not _es_color(elemento['color']):
        errores.append('color debe venir como #rrggbb.')

    if tipo == 'imagen':
        recurso = elemento.get('recurso_id')
        if not isinstance(recurso, int):
            errores.append('recurso_id debe ser un entero.')
        elif recursos_permitidos is not None and recurso not in recursos_permitidos:
            # AMBITO>> Sin esta comprobacion, un maestro monta el marco de otra
            # academia con solo escribir su id en el documento.
            errores.append('Ese recurso no existe o no es tuyo.')

    return errores


def validar_documento(documento, *, recursos_permitidos=None) -> dict:
    """
    Devuelve los errores del documento. Diccionario vacio = documento valido.

    La forma de la respuesta es `{'documento': [...], 'elementos': {id: [...]}}`
    para que el editor pueda marcar en rojo el elemento concreto que esta mal.
    Un mensaje suelto obligaria al maestro a adivinar cual de los cuarenta.

    `recursos_permitidos` es el conjunto de ids que este usuario puede usar.
    Con `None` no se comprueba, que es lo correcto al validar la semilla y lo
    INCORRECTO al validar lo que manda un maestro.
    """
    generales = []
    por_elemento = {}

    if not isinstance(documento, dict):
        return {'documento': ['El documento debe ser un objeto.']}

    if documento.get('version') != 1:
        generales.append('version debe ser 1.')

    pagina = documento.get('pagina', PAGINA_POR_DEFECTO)
    if pagina not in PAGINAS:
        generales.append(f'pagina debe ser una de {sorted(PAGINAS)}.')
        pagina = PAGINA_POR_DEFECTO
    ancho_pagina, alto_pagina = PAGINAS[pagina]

    elementos = documento.get('elementos')
    if not isinstance(elementos, list):
        generales.append('elementos debe ser una lista.')
        return {'documento': generales}

    if len(elementos) > MAXIMO_DE_ELEMENTOS:
        generales.append(f'No caben más de {MAXIMO_DE_ELEMENTOS} elementos.')

    vistos = set()
    for posicion, elemento in enumerate(elementos):
        if not isinstance(elemento, dict):
            generales.append(f'El elemento en la posición {posicion} no es un objeto.')
            continue

        identificador = elemento.get('id')
        if not isinstance(identificador, str) or not identificador:
            generales.append(f'El elemento en la posición {posicion} no tiene id.')
            continue
        if identificador in vistos:
            generales.append(f'id repetido: {identificador!r}.')
            continue
        vistos.add(identificador)

        errores = _validar_elemento(elemento, ancho_pagina, alto_pagina, recursos_permitidos)
        if errores:
            por_elemento[identificador] = errores

    # Lo bloqueado de la semilla tiene que seguir ahi. Un diploma sin codigo de
    # verificacion no se puede comprobar, y es justo lo que un editor libre
    # borraria primero por estorbar.
    obligatorios = {
        elemento['id'] for elemento in DOCUMENTO_SEMILLA['elementos']
        if elemento.get('bloqueado')
    }
    faltan = obligatorios - vistos
    if faltan:
        generales.append(f'No se pueden quitar estos elementos: {sorted(faltan)}.')

    resultado = {}
    if generales:
        resultado['documento'] = generales
    if por_elemento:
        resultado['elementos'] = por_elemento
    return resultado
