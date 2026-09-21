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
| `texto` | Texto fijo que escribe el maestro | `contenido` (máx. 300 caracteres) |
| `imagen` | Logo, firma o sello | `recurso_id`, `alto` |
| `qr` | QR a la página de verificación | `lado` |
| `linea` | Raya horizontal | `grosor` |

Propiedades comunes a todos: `id`, `tipo`, `x`, `y`, `ancho`, `z` (orden de dibujo, opcional) y
`bloqueado` (opcional, por defecto `false`).

Propiedades comunes a `campo` y `texto`: `fuente`, `tamano`, `color`, `align`
(`left` \| `center` \| `right`), `mayusculas` (bool, opcional).

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
