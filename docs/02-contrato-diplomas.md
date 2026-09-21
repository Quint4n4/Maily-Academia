# Contrato — editor de diplomas

> Artefacto de traspaso de la fase 2. Quien implemente lee **este archivo**, no el historial de un
> chat. Nada que no esté aquí se inventa: si falta, se pregunta y se agrega aquí primero.
>
> Repo: `Maily-Academia` · Escrito el `2026-09-21` · Aprobado por Emanuel el `2026-09-21`
> Parte de: `feat/diploma-unico-academy360` (fase 0, ya fusionable)

---

## 1 · Qué se construye y qué NO

Un editor donde **el maestro arma el diploma de su curso arrastrando elementos**, elige un marco de
una galería o sube el suyo, y coloca su logo.

**Lo que no se construye, y conviene que quede escrito:**

- No es un editor de diseño libre tipo Canva. No hay capas arbitrarias, ni filtros, ni formas
  vectoriales, ni rotación en la primera versión.
- No se sustituye el generador del servidor. **El PDF lo dibuja siempre el backend.** Un diploma
  que se arma en el navegador lo puede fabricar cualquiera con las herramientas de desarrollo.
- No hay tipografías libres. Ver §5.

### La tensión que resuelve este contrato

Emanuel pidió dos cosas opuestas con tres días de diferencia: *"un solo formato para todo con la
firma de Academy360"* y *"que cada maestro cree su diploma a su gusto"*. Un formato único da
consistencia de marca; un editor libre da tres academias emitiendo documentos que no se parecen.

**Decisión: plantilla base bloqueada + zonas editables.** Es el modelo de Moodle `customcert`,
donde el administrador del sitio publica plantillas y el profesor con permiso de edición las
duplica y ajusta las de su curso. En concreto:

| Lo fija la plataforma | Lo mueve el maestro |
|---|---|
| El QR y el código de verificación (`bloqueado: true`) | Posición y tamaño de todo lo demás |
| Que exista el nombre del alumno y el del curso | Tipografía, cuerpo y color dentro del catálogo |
| El tamaño de página | El marco de fondo y sus propias imágenes |

Un elemento con `bloqueado: true` se puede mover pero **no borrar**. El validador del servidor
rechaza un documento al que le falte.

---

## 2 · El documento del diploma

El layout deja de ser código y pasa a ser un JSON que el maestro edita y el servidor interpreta.

```json
{
  "version": 1,
  "pagina": "a4-horizontal",
  "fondo": { "recurso_id": 12 },
  "elementos": [
    { "id": "e1", "tipo": "campo", "campo": "alumno",
      "x": 30, "y": 70, "ancho": 237,
      "fuente": "sans-bold-italic", "tamano": 30, "color": "#1b1c19", "align": "center" },

    { "id": "e2", "tipo": "texto", "contenido": "Por haber concluido satisfactoriamente el curso",
      "x": 30, "y": 90, "ancho": 237,
      "fuente": "sans", "tamano": 12, "color": "#5c5b5a", "align": "center" },

    { "id": "e3", "tipo": "imagen", "recurso_id": 45,
      "x": 120, "y": 150, "ancho": 57, "alto": 20 },

    { "id": "e4", "tipo": "qr", "x": 245, "y": 155, "lado": 22, "bloqueado": true },

    { "id": "e5", "tipo": "linea", "x": 110, "y": 168, "ancho": 77, "grosor": 0.8,
      "color": "#1b1c19" }
  ]
}
```

### Unidades y origen — la trampa número uno

**Todo se guarda en milímetros, con el origen en la esquina superior izquierda.**

- **Milímetros, no píxeles.** Si se guardan píxeles del navegador, el diploma se descuadra según
  el monitor de quien lo editó. El editor multiplica por un factor de escala al pintar; la base
  guarda milímetros sobre la página real de 297 × 210 mm.
- **Origen arriba-izquierda**, como el navegador y como Canva. ReportLab usa abajo-izquierda: la
  conversión (`y_pdf = alto_pagina - y - alto_elemento`) se hace **en el backend, en un solo
  sitio**. Es deliberado que la conversión no viva en el frontend.
- `x`, `y` son la **esquina superior izquierda** del elemento, nunca su centro. El texto se alinea
  dentro de `ancho` según `align`. Es más predecible que anclar al centro y es lo que espera
  cualquiera que haya usado un editor.

### Tipos de elemento

| `tipo` | Qué imprime | Propiedades propias |
|---|---|---|
| `campo` | Una de las variables | `campo`: `alumno` \| `curso` \| `maestro` \| `academia` \| `fecha` \| `codigo` |
| `texto` | Texto fijo, **con marcadores** | `contenido` (máx. 300 caracteres) |
| `imagen` | Logo, firma o sello | `recurso_id`, `alto` |
| `qr` | QR a la página de verificación | — (usa `ancho` como lado) |
| `linea` | Raya horizontal | `grosor` |
| `sello` | Sello circular dibujado | `contenido` (el texto de dentro) |

Propiedades comunes a todos: `id`, `tipo`, `x`, `y`, `ancho`, `z` (orden de dibujo, opcional) y
`bloqueado` (opcional, por defecto `false`).

Propiedades comunes a `campo` y `texto`: `fuente`, `tamano`, `color`, `align`
(`left` \| `center` \| `right`), `mayusculas`, `espaciado`, y las dos de abajo.

### Marcadores, `autoajuste` y `max_lineas`

`contenido` admite marcadores de las seis variables:

```json
{ "tipo": "texto", "contenido": "impartido por {maestro}  ·  {academia}" }
```

Se reemplazan **literalmente, no con `str.format`**: el maestro escribe ese texto, y una llave
suelta —`"horario {tarde}"`— reventaría la emisión con un `KeyError` en la descarga del alumno. Si
un marcador queda vacío (`Course.section` admite null), el separador que se queda sin uno de sus
dos lados se limpia solo.

- **`autoajuste`** (bool): baja el cuerpo de letra hasta que el texto quepa en `ancho`. Es lo que
  impide que un nombre de cincuenta letras toque el borde del diploma.
- **`max_lineas`** (int, por defecto 1): parte el texto por palabras. Si aún no cabe, recorta con
  puntos suspensivos, que es preferible a que el título de un curso invada la zona de la firma.

Sin estas dos, el editor produce diplomas rotos con solo escribir un nombre largo.

---

## 3 · Modelo de datos

### `PlantillaDeDiploma`

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | CharField(120) | Lo ve el maestro al elegir |
| `documento` | JSONField | El JSON de §2 |
| `alcance` | choices: `global` \| `academia` \| `instructor` | Quién la puede usar |
| `section` | FK Section, null | **AMBITO>>** obligatorio si `alcance='academia'` |
| `owner` | FK User, null | Obligatorio si `alcance='instructor'` |
| `es_semilla` | bool | La que se copia al crear una nueva. Solo una global |
| `creado_en` / `actualizado_en` | DateTime | |

### `RecursoDeDiploma` — los marcos y los logos

| Campo | Tipo | Notas |
|---|---|---|
| `tipo` | choices: `marco` \| `logo` \| `firma` \| `sello` | |
| `nombre` | CharField(120) | |
| `cloudinary_public_id` | CharField(255) | Se sube con `apps/courses/almacenamiento.py`, que ya existe |
| `ancho_px` / `alto_px` | int | Se leen al subir, para que el editor calcule la proporción |
| `alcance` | choices: `global` \| `academia` \| `instructor` | Los marcos que suba el admin son `global` |
| `section` / `owner` | FK, null | **AMBITO>>** igual que arriba |

### Cambios en modelos existentes

| Modelo | Campo | Para qué |
|---|---|---|
| `Course` | `plantilla_de_diploma` FK null | Qué plantilla usa este curso. Null = la semilla |
| `Certificate` | `documento_congelado` JSONField null | **El diseño del día de la emisión** |

`documento_congelado` es la continuación de lo que ya se hizo en la fase 0: hoy se congelan los
cuatro textos, pero si el maestro rediseña su plantilla mañana, los diplomas de ayer cambiarían de
aspecto. Se guarda el JSON completo y no una FK a la plantilla, para que el diploma sobreviva a que
alguien borre la plantilla que lo produjo. Cuesta unos pocos KB por certificado; a la escala de
este proyecto no es discusión.

---

## 4 · Contrato de API

Prefijo `/api/diplomas/`. Respuestas DRF planas, paginación estándar del repo (`PAGE_SIZE: 20`).

| Método y ruta | Qué hace | Devuelve |
|---|---|---|
| `GET /plantillas/` | Las que este usuario puede usar | Lista |
| `POST /plantillas/` | Crear duplicando otra: `{"nombre", "copiar_de": id}` | 201 con la nueva |
| `GET /plantillas/{id}/` | Una plantilla con su `documento` | 200 / 404 |
| `PATCH /plantillas/{id}/` | Guardar: `{"documento": {...}}` | 200 / 400 con errores por elemento |
| `DELETE /plantillas/{id}/` | Borrar una propia | 204 / 404 |
| `POST /plantillas/{id}/preview/` | **PDF real con datos de ejemplo.** No emite nada | 200 `application/pdf` |
| `GET /recursos/?tipo=marco` | La galería visible para este usuario | Lista |
| `POST /recursos/` | Subir imagen (multipart) | 201 / 400 |
| `DELETE /recursos/{id}/` | Borrar uno propio | 204 / 404 |
| `PATCH /api/courses/{id}/` | `{"plantilla_de_diploma": 7}` | 200 |

**404 y no 403** en todo lo ajeno, igual que en el resto del repo: un 403 confirma que el recurso
existe y permite contarlos por enumeración de ids.

### `preview/` es la pieza que hace que esto funcione

El navegador mide el texto distinto a ReportLab. Un editor que *predice* el PDF siempre miente un
poco, y el maestro descubre la diferencia cuando un alumno ya descargó el diploma.

La defensa es no predecir: el botón **Previsualizar** pide al servidor el PDF de verdad, con datos
de ejemplo, y lo muestra. El editor sirve para colocar; la verdad la dice el mismo código que
emitirá el diploma. Es como lo resuelve Moodle, y por eso funciona.

---

## 5 · Tipografías — catálogo cerrado

| Clave | Fuente real |
|---|---|
| `sans`, `sans-bold`, `sans-italic`, `sans-bold-italic` | Helvetica |
| `serif`, `serif-bold`, `serif-italic` | Times |
| `mono` | Courier |

Son las Type1 base de PDF: existen en cualquier lector, traen los acentos del español y no hay que
empaquetar nada.

**Meter una fuente de marca o una cursiva de diploma cuesta trabajo real:** subir el `.ttf` al
repo, registrarlo en ReportLab al arrancar, servirlo como webfont al editor y comprobar que tiene
los glifos acentuados. Es viable, pero es una tarea por fuente, no una opción en un menú. Que
nadie prometa "las fuentes de Canva".

---

## 6 · Validación en el servidor

El `documento` es entrada del usuario. Sin validarlo, un `PATCH` con basura deja a ese maestro sin
poder emitir diplomas nunca más, **y el error aparece en la descarga del alumno, no en el editor**.

Se rechaza con 400 un documento que:

1. Tenga un `tipo` fuera de la lista de §2, o una `fuente` fuera del catálogo de §5.
2. Coloque un elemento fuera de la página, o con `ancho`/`alto` ≤ 0, o que se salga por la derecha
   o por abajo.
3. Traiga `tamano` fuera de 5–80 pt, o `contenido` de más de 300 caracteres.
4. Referencie un `recurso_id` que este usuario no puede ver. **AMBITO>>** — si no se comprueba,
   un maestro monta el marco de otra academia con solo poner el id.
5. Haya perdido un elemento `bloqueado` que la plantilla base traía.
6. Tenga `id` repetidos, o más de 40 elementos.

Los errores se devuelven **por elemento** (`{"elementos": {"e3": ["..."]}}`), no como un mensaje
suelto: el editor tiene que poder marcar en rojo el elemento que está mal.

---

## 7 · Subida de imágenes

Se reutiliza `apps/courses/almacenamiento.py`, que ya sube y borra en Cloudinary y tiene test.

Reglas, que aquí no son opcionales:

- **Solo PNG, JPG y WEBP. SVG jamás.** Un SVG puede traer `<script>` dentro y es XSS el día que
  alguien lo muestre inline en el editor.
- **No confiar en la extensión ni en el `Content-Type`**: los manda el cliente. Se abre con Pillow
  y se comprueba que de verdad sea la imagen que dice ser.
- **Límite de peso (5 MB) y de dimensiones.** El peso no basta: un PNG de 3 MB puede
  descomprimirse a 50.000 × 50.000 px y tumbar el worker. Pillow trae `MAX_IMAGE_PIXELS` para eso.
- Un marco de fondo se recomienda a **150 dpi (1754 × 1240 px)**. A 300 dpi el archivo se va a
  varios MB y **cada diploma emitido pesa eso**, que lo descarga el alumno desde el celular.

---

## 8 · Permisos

| Acción | alumno | instructor | admin | superadmin |
|---|---|---|---|---|
| Ver plantillas globales y de su academia | no | sí | sí | sí |
| Crear/editar plantilla **propia** | no | sí | sí | sí |
| Editar plantilla **global o de otro** | no | **no** | sí | sí |
| Subir recurso propio | no | sí | sí | sí |
| Publicar recurso **global** (la galería de marcos) | no | **no** | sí | sí |
| Asignar plantilla a un curso | no | sí, **solo a sus cursos** | sí | sí |
| Previsualizar | no | sí | sí | sí |

**AMBITO>>** Un instructor ve: las globales + las de las academias donde tiene membresía de
instructor + las suyas. Nada más. Es el mismo criterio de `secciones_visibles_para`, y se
implementa con un selector, no repitiendo el filtro en cada vista — que es exactamente el error
que produjo las tres fugas de la sesión del 2026-09-07.

---

## 9 · El editor

Ruta nueva **`/instructor/cursos/:id/diploma`**. Fuera de `CourseBuilder.jsx`, que ya tiene 1899
líneas.

Tres zonas: paleta de elementos a la izquierda, lienzo al centro, propiedades del elemento
seleccionado a la derecha. Botones: *Previsualizar*, *Guardar*, *Restablecer*.

**Al abrir por primera vez se carga la plantilla semilla**, que es el layout que ya produce
`pdf.py` hoy. El maestro nunca empieza con una hoja en blanco: mueve lo que ya está puesto.

### Librería de arrastre

**`react-rnd`.** Arrastrar y redimensionar sobre `div`s posicionados. Es la única dependencia nueva
del frontend (~10 KB).

| Descartada | Por qué |
|---|---|
| `react-konva` / `fabric.js` | Es lo que usan los editores tipo Canva de verdad, pero dibujan en `<canvas>`, y un canvas no se inspecciona con las DevTools. Cuando algo salga mal, se depura a ciegas |
| `dnd-kit` | Arrastra pero no redimensiona, y hay que redimensionar imágenes |
| `react-moveable` | Más potente (guías, rotación) y más API que aprender. Segunda opción si `react-rnd` se queda corto |
| Escribirlo a mano | El arrastre son ~80 líneas con eventos de puntero, pero las manijas de redimensión son otras tantas más el manejo de proporción |

---

## 10 · Fases

| Fase | Qué entra | Sirve sola |
|---|---|---|
| **0** | Generador por código, congelado de datos, QR, 25 tests | **hecho** |
| **1** | Motor `documento` → PDF, validador de §6, plantilla semilla, `preview/` | Sí: se definen plantillas por JSON |
| **2** | `RecursoDeDiploma`, subida validada, galería, elegir marco y plantilla desde el panel | Sí: marcos de Canva sin editor |
| **3** | El editor visual | Es la cara |
| **4** | `documento_congelado` en `Certificate` y la matriz de permisos completa | Cierra el riesgo |

**Las fases 1 y 2 entregan la mayor parte de lo que se pidió** —marco propio, logo del maestro,
posiciones definidas— sin una sola línea de arrastre. La 3 es la cara y va al final a propósito.

---

## 11 · Riesgos declarados

| # | Riesgo | Qué lo contiene |
|---|---|---|
| R1 | El editor y el PDF no coinciden | `preview/` con el PDF real, y catálogo cerrado de fuentes |
| R2 | Un marco pesado hace que cada diploma pese varios MB | Límite de subida y recomendación de 150 dpi |
| R3 | Un documento inválido rompe la emisión y se descubre tarde | Validación en `PATCH`, no en la descarga |
| R4 | Un maestro usa recursos de otra academia | Punto 4 de §6, comprobado con un test de fuga |
| R5 | Rediseñar una plantilla cambia diplomas ya emitidos | `documento_congelado`, fase 4 |
| R6 | El editor crece dentro de `CourseBuilder.jsx` | Ruta propia desde el primer commit |

**R5 sigue abierto hasta la fase 4.** Si las fases 1 a 3 llegan a producción sin ella, se reabre
exactamente el fallo que la fase 0 acaba de cerrar, y esta vez sobre el diseño en vez de sobre los
textos.

---

## 12 · Verificadores

Cada fase cierra con:

- `docker compose exec -T backend pytest` en verde, con **al menos un test de fuga entre academias**
  para lo que esa fase añada.
- `cd cursos-maily && npm run lint` sin errores nuevos.
- Migraciones **escritas y no aplicadas**: `verificadores.migraciones: solo-emanuel`.
- Un PDF de muestra mirado con los ojos. La fase 0 tenía todo el contenido apelotonado en la mitad
  superior y ningún test lo habría detectado.

---

## 13 · Cambios durante la implementación de la fase 1

> Escritos aquí y no corregidos en silencio arriba: un contrato que cambia sin dejar rastro deja de
> servir para lo que existe. Fecha: `2026-09-21`.

**1 · La semilla vive en el código, no en la base.** El contrato daba por hecho una fila con
`es_semilla=True` creada por una migración de datos. No se hizo así: una migración que copia un
JSON se queda **congelada en la versión vieja** el día que la semilla evolucione, y una base nueva
nacería con un diseño distinto al de una base antigua. `documento_semilla()` en
`apps/certificates/documento.py` es la fuente. El campo `es_semilla` se queda en el modelo para
que un administrador pueda designar otra desde la base, pero si no hay ninguna manda la del código,
así que **la semilla no puede faltar**.

**2 · `POST /plantillas/` no acepta `documento`.** Solo `{"nombre", "copiar_de"}`. El documento se
manda después con `PATCH`, que es el camino que valida. Aceptarlo también al crear sería un segundo
sitio donde validar, y el segundo sitio es el que se olvida.

**3 · La forma real de los errores.** DRF anida los errores bajo el nombre del campo, así que
llegan un nivel más abajo de lo que decía §6:

```json
{ "documento": {
    "documento": ["No se pueden quitar estos elementos: ['codigo', 'qr']."],
    "elementos": { "a": ["El elemento se sale por arriba o por la izquierda."] }
} }
```

Se documenta como es, en vez de forzar el código a una forma escrita antes de ver el
comportamiento. El frontend lee `error.response.data.documento.elementos[id]`.

**4 · Tipo `sello`.** No estaba en los cinco tipos y la semilla lo necesita: el sello circular del
centro no es decoración, sin él la mitad inferior del diploma queda vacía. Se puede borrar —no está
bloqueado— para quien use un marco de Canva que ya traiga medalla.

**5 · `preview/` acepta un documento sin guardar.** En el cuerpo, opcional. Si obligara a guardar
antes de ver, el maestro tendría que romper su plantilla buena para probar una idea.

**6 · Los recursos se validan contra un conjunto vacío.** La galería es la fase 2, así que hoy
**ningún** `recurso_id` es válido. Va `recursos_permitidos=set()` y no `None` a propósito: `None`
salta la comprobación, y dejarlo así sería empezar la fase 2 con el agujero ya abierto.

### Lo que la fase 1 dejó funcionando

| | |
|---|---|
| `documento.py` | Catálogo, semilla de 17 elementos y validador |
| `pdf.py` | Motor que interpreta el documento. **Un solo camino de dibujo**: la descarga del alumno usa el mismo código que la vista previa |
| `models.py` | `PlantillaDeDiploma`, con índice único parcial para que solo haya una semilla |
| `selectors.py` | `plantillas_visibles_para` y `plantillas_editables_por` |
| API | `GET/POST /plantillas/`, `GET/PATCH/DELETE /plantillas/{id}/`, `POST /plantillas/{id}/preview/` |
| Tests | 28 nuevos, 53 en la app, 217 en el repo |

Verificado de punta a punta contra el servidor local con la cuenta de `seed_data`: crear devuelve
los 17 elementos, la vista previa devuelve un PDF de 5.4 KB, y un documento con un elemento fuera
de la página devuelve 400 señalando cuál.

---

## 14 · Cambios durante la implementación de la fase 2

> Fecha: `2026-09-21`.

**1 · No hay tipo `firma`.** El contrato lo listaba en §3 y se dejó fuera. Estas imágenes suben a
Cloudinary como `resource_type='image'`, y Cloudinary **sí** las entrega por enlace directo: un
marco decorativo público no molesta a nadie, pero una firma manuscrita en una URL pública es una
firma que cualquiera descarga y reusa. Cloudinary tiene entrega autenticada y serviría, pero **no
se ha medido contra la cuenta real** —el `CLAUDE.md` avisa de no subir nada desde una máquina de
desarrollo sin comprobar si es la misma cuenta que producción—. Prometer que una firma está
protegida sin haberlo comprobado es peor que no ofrecerla. Los tipos vivos son `marco`, `logo` y
`sello`.

**2 · `Course.plantilla_de_diploma`, y su campo en la API.** Sin esto la galería no llega al
diploma: se podían crear plantillas preciosas que ningún curso usaba. Se añadió
`plantilla_de_diploma_id` a `CourseCreateUpdateSerializer`, **con el queryset acotado a
`plantillas_visibles_para(request.user)`**. El queryset es la validación: DRF rechaza con 400
cualquier id fuera de él, así que un maestro no puede asignar a su curso la plantilla de otra
academia mandando su número.

Efecto secundario que conviene saber: `apps/courses/serializers.py` ahora importa de
`apps/certificates`. Es la primera dependencia en esa dirección entre las dos apps.

**3 · Las imágenes se copian en disco la primera vez.** Dibujar un marco obliga a traerlo al
servidor, y eso es una petición de red dentro de la petición del alumno con dos workers de
gunicorn. `ruta_local_de()` guarda una copia y las siguientes descargas la leen de ahí. Se escribe
en un archivo aparte y se mueve, para que dos peticiones simultáneas no lean uno a medio escribir.

**4 · Si la imagen no se puede traer, el diploma sale sin ella.** `resolver_recurso` devuelve `None`
y el elemento no se dibuja. Un alumno que pidió su diploma prefiere uno sencillo a un 500. Hay un
test que lo provoca.

**5 · La imagen se valida ANTES de subir.** Subir primero y preguntar después gasta la cuota del
plan con basura y deja imágenes huérfanas en Cloudinary cuando la fila no llega a crearse.

**6 · `recursos_permitidos` ya recibe el conjunto real.** La fase 1 pasaba `set()`. Hay un test que
deja escrito qué se pierde si alguien lo cambia a `None` «para que funcione»: con `None` el
validador **acepta cualquier id**, y basta con escribir el número de un marco ajeno en el documento.

### Lo que la fase 2 dejó funcionando

| | |
|---|---|
| `almacenamiento.py` | Validación de imagen, subida, borrado y copia local con caché |
| `RecursoDeDiploma` | Marcos, logos y sellos con su alcance |
| API | `GET/POST /recursos/`, `DELETE /recursos/{id}/`, y `plantilla_de_diploma_id` en el curso |
| Tests | 24 nuevos, 77 en la app, 241 en el repo |

**La subida a Cloudinary no se ha ejercitado contra la cuenta real**, por el aviso del `CLAUDE.md`.
Los tests usan un doble. Lo que sí se probó de verdad, y contra el servidor: un SVG con `<script>`
dentro, renombrado a `.png` y enviado con `Content-Type: image/png`, se rechaza con 400.

### Lo que falta para cerrar el ciclo

La fase 2 deja la galería y la asignación, pero **el maestro todavía no tiene dónde pulsar**: no hay
pantalla. Eso es la fase 3. Hasta entonces esto se maneja por API o desde el admin de Django.
