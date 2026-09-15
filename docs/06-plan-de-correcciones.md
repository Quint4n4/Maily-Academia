# Plan de correcciones

> Artefacto de traspaso. Cada sesión de corrección **lee este archivo**, no el historial de un chat.
> Se verifica en local; nada sube a producción hasta que su sesión cierre aquí.
>
> Origen: `docs/00-deuda.md` (línea base del 2026-09-02) · Plan escrito el `2026-09-03`

---

## Antes de abrir la primera sesión: dos advertencias

**1 · Una sesión a la vez sobre esta carpeta.** Dos sesiones sobre el mismo repo se pisan los
archivos. Si quieres paralelizar, cada una necesita su propio `git worktree`:

```bash
cd ~/Desktop/Maily-Academia && git worktree add ../maily-s2 -b fix/logout-revoca
```

**2 · Cada sesión abre su rama, ninguna toca `main`.** El nombre de la rama está en cada ficha.

---

## Estado de partida: dos ramas sin fusionar

| Rama | Qué trae | Qué falta |
|---|---|---|
| `fix/student-course-visibility` | Orden de los listados, paginación del catálogo, validación al publicar, errores visibles al publicar | Que la revises y decidas si entra |
| `chore/adoptar-biblioteca` | Perfil del repo, línea base de deuda, `MEMORIA.md`, agentes locales archivados | Confirmar las 6 claves `[propuesto]` |

**Ninguna de las dos toca el P0.** Las sesiones de abajo salen de `main`, salvo donde se indique.

---

## Sesión 0 · Decisiones — CERRADA el 2026-09-03

Las seis claves `[propuesto]` quedaron confirmadas en `.claude/PERFIL-DEL-REPO.md`. Ninguna sesión
tiene que adivinar ya.

Y las tres respuestas que decidían el arreglo del P0:

1. **Vitrina pública: SÍ.** El catálogo se ve sin iniciar sesión, para captar alumnos.
2. **Los videos de hoy son públicos en YouTube**, así que la fuga actual es de títulos, temario y
   URLs de videos que ya eran públicos. Grave por lo que revela del cliente, no por el contenido.
3. **Van a llegar videos reales** y hay que alojarlos. Eso abre la sesión 7.

---

## Sesión 1 · P0 · Separar la vitrina del contenido

**Rama:** `fix/course-catalog-isolation` (desde `main`) · **Prioridad: primera, sin discusión**

Con vitrina pública, el arreglo **no es cerrar el catálogo**: es trazar la frontera entre lo que
vende y lo que se paga.

| Un anónimo SÍ debe ver | Un anónimo NO debe ver |
|---|---|
| Título, descripción, imagen, nivel, duración, precio, instructor | `video_url` de ninguna lección |
| Cuántas lecciones y cuántos alumnos | Los materiales de apoyo |
| El temario: títulos de módulos y lecciones | Nada de ninguna academia con `allow_public_preview=False` |

### Lo que ya está resuelto en el repo y hay que usar

- `CourseListSerializer` (`apps/courses/serializers.py:136-147`) **ya es exactamente la vitrina**:
  no incluye módulos ni videos. No hay que tocarlo.
- `allow_public_preview` en `Section` y `CanViewSectionPreview` ya existen y no se usan.

### El arreglo

1. `CourseListCreateView.get_queryset` (`apps/courses/views.py:70`): el anónimo ve solo cursos
   publicados de secciones con `allow_public_preview=True`. El autenticado, los de sus academias.
2. `CourseDetailView` (`:193`): el problema real está aquí. `CourseDetailSerializer` anida
   `modules → lessons → video_url` (`serializers.py:157`). Para un anónimo hay que servir un
   serializer de ficha pública **con el temario y sin las URLs de video**. Para una academia sin
   vitrina, 404.
3. Poner el ancla `AMBITO>>` como comentario en cada vista que filtre por academia. Es la clave
   `aislamiento.ancla` del perfil, y es lo que hace repetible la auditoría con
   `mecanismo: manual-por-vista`.
4. Montar `pytest` + `pytest-django` (hoy no hay **ningún** test) y escribir el test de fuga.

### Fuera de alcance

El refactor a capa de servicios (sesión 6) y el alojamiento de video (sesión 7).

### Prompt de arranque

```
Lee .claude/PERFIL-DEL-REPO.md (completo, incluida la seccion de vitrina y la de
video) y docs/00-deuda.md, seccion P0. Carga las skills protocolo-de-revision,
aislamiento-de-datos y django-backend.

Cierra el P0. GET /api/courses/ y GET /api/courses/{id}/ tienen AllowAny y su
queryset solo filtra status='published', nunca por seccion ni membresia.

El catalogo SI debe ser publico: es la vitrina para captar alumnos. Lo que no
debe ser publico es el contenido. La frontera exacta esta en el perfil.

- Lista: el anonimo ve cursos publicados de secciones con allow_public_preview.
  CourseListSerializer ya es la vitrina correcta, no lo cambies.
- Detalle: CourseDetailSerializer anida modules -> lessons -> video_url. Un
  anonimo necesita la ficha con el temario y SIN las URLs de video. En una
  academia sin vitrina, 404 (no 403).
- Reutiliza allow_public_preview y CanViewSectionPreview: ya existen.
- Pon el ancla AMBITO>> en cada vista que filtre por academia.
- Monta pytest + pytest-django y escribe el test de fuga. El repo no tiene
  ningun test; ese andamio lo usan las sesiones siguientes.

verificadores.migraciones es solo-emanuel: no corras migrate. Si hace falta una
migracion, dejala escrita y avisa.

Rama fix/course-catalog-isolation desde main. No toques el frontend.
```

### Cómo lo verificamos aquí

| Criterio | Esperado |
|---|---|
| Anónimo pide el catálogo | Solo cursos de academias con `allow_public_preview=True` |
| Anónimo pide la ficha de un curso con vitrina | 200 **con temario y sin ningún `video_url`** |
| Anónimo pide la ficha de un curso de Corporativo CAMSA | **404** |
| `estudiante2` (miembro de Longevity) pide la ficha de un curso suyo | 200 **con** `video_url` |
| `estudiante2` pide un curso de Corporativo | **404** |
| Instructor sigue viendo sus propios cursos completos | 200 |
| `grep -rn "AMBITO>>" backend/` | Una línea por cada vista que filtra |
| Las 8 pantallas autenticadas | Sin regresión |
| El test de fuga | Verde. Y **rojo si se revierte el arreglo** |

Ese último criterio es el que separa un test de un adorno. Y el segundo es el que separa una vitrina
de una fuga: si algún `video_url` sale en la respuesta anónima, el arreglo no está hecho.

---

## Sesión 2 · P1 · Cerrar sesión de verdad

**Rama:** `fix/session-revocation` (desde `main`)

Hoy `POST /api/auth/logout/` → 404. El `logout()` del frontend solo borra `sessionStorage`
(`cursos-maily/src/context/AuthContext.jsx:146`) y **el refresh token sigue válido 7 días**.

### Alcance

- Endpoint de logout que ponga el refresh en la lista negra (`token_blacklist` ya está instalado).
- `AuthContext.logout()` lo llama antes de limpiar el almacenamiento local.
- Que el logout funcione aunque la petición falle: si el servidor no responde, la sesión local se
  cierra igual. Un logout que se cuelga es peor que uno incompleto.
- Test: cerrar sesión y reintentar con el refresh anterior → 401.

### Cómo lo verificamos aquí

Es el **punto 3 de `security-checklist`**, el que originó la Regla 1 de tu protocolo. Se comprueba
provocándolo, no leyendo `settings.py`:

```bash
# login → guardar refresh → logout → reintentar el refresh viejo
```

| Criterio | Esperado |
|---|---|
| Reintentar el refresh después del logout | **401** |
| Cerrar sesión con el backend caído | La sesión local se cierra igual |
| `backend.revocacion_de_sesion` en el perfil | Actualizado a `si: logout + blacklist`, con la fecha |

---

## Sesión 3 · P1 · Endurecer entrada y respuestas

**Rama:** `fix/input-hardening` (desde `main`) · Tres arreglos acotados, ninguno toca lógica de negocio

| Qué | Dónde | Hoy |
|---|---|---|
| Límite en campos de texto | `backend/apps/courses/models.py:88` y los serializers | 1 MB en `description` → **HTTP 201** |
| `Cache-Control: no-store` en datos personales | Respuestas con datos de usuario | Solo `Vary: origin` |
| 404 en vez de 403 sobre recurso ajeno | `GET /api/users/{id}/` | **403** — confirma que el usuario existe |

### Cómo lo verificamos aquí

| Criterio | Esperado |
|---|---|
| 1 MB en cualquier campo libre | **400**, no 201 ni 500 |
| `GET /api/users/me/` | Cabecera `Cache-Control: no-store` |
| `GET /api/users/{ajeno}/` | **404** |
| Un texto legítimo largo (2000 caracteres) | Se sigue guardando |

Ese último criterio evita que el arreglo rompa descripciones reales.

---

## Sesión 4 · P1 · Ver lo que pasa en producción

**Rama:** `chore/observability` (desde `main`)

Dos huecos que hoy te dejan a ciegas:

- **Sin monitoreo de errores.** `cumplimiento.monitoreo_errores: ninguno`. Te enteras de un fallo
  cuando un usuario avisa. Sentry en plan gratuito es el hueco más barato de tapar que tienes.
- **La bitácora de auditoría no persiste.** `AuditLogMiddleware`
  (`backend/apps/users/middleware.py:41`) hace `logger.info` y nada más. En Railway los logs se
  rotan. La skill es explícita: *una bitácora que no se puede consultar por recurso y por actor no
  responde la pregunta que la hace requisito*.

### Decisión dentro de esta sesión

Persistir la bitácora en la base tiene costo: una escritura por acción sensible. Con tus 1–3
usuarios concurrentes es irrelevante, pero **decide qué se audita** antes de escribirlo: hoy
`AUDIT_PATHS` cubre unas rutas y no otras.

### Cómo lo verificamos aquí

| Criterio | Esperado |
|---|---|
| Provocar un error con un dato personal | Llega a Sentry **sin el dato sensible** (punto 24) |
| Hacer una acción auditada y consultar la bitácora | Registro con actor, recurso, acción y fecha |
| La bitácora se consulta por recurso y por actor | Es lo que la vuelve requisito cumplido |

---

## Sesión 5 · Frontend · Estético y accesibilidad

**Rama:** `fix/ui-polish` (desde `main`) · **Depende de que yo audite primero**

Esta no arranca todavía. La Regla 2 de tu protocolo lo impide:

> Solo entra lo que ya se ejercitó en un proyecto real. Si no puedes nombrar el proyecto y el día en
> que ese problema ocurrió, todavía no es un punto.

Así que el orden es: **audito el frontend a mano → de los defectos reales sale la skill → la sesión
los arregla.** Escribir la skill primero sería una lista de buenas prácticas genéricas.

### Defectos ya detectados (material de partida)

| # | Defecto | Dónde |
|---|---|---|
| 1 | Thumbnails con bandas negras: sin recorte ni relación de aspecto fija. `ImageCropModal.jsx` existe y no se usa en este flujo | Modal de nuevo curso y tarjetas |
| 2 | Tooltip que dice "Sin archivos seleccionados" junto a una imagen ya cargada | `CourseBuilder`, sección de thumbnail |
| 3 | Dos formularios para lo mismo con campos distintos: el modal de creación no tiene "Requerir evaluación final" y el editor sí | `instructor/MyCourses` vs `CourseBuilder` |
| 4 | `MyCourses` del instructor no pagina: con más de 20 cursos, el mismo bug que arreglamos del lado del alumno | `pages/instructor/MyCourses.jsx` |

Lo que falta auditar: contraste de color en los dos temas, tamaño de área táctil, navegación por
teclado, foco visible, estados vacíos y de carga, jerarquía tipográfica, responsive real en móvil, y
los textos de interfaz.

### Cómo lo verificamos aquí

Con el navegador, pantalla por pantalla, en tema claro y oscuro, y en viewport de móvil. Cada punto
de la skill nueva se contesta con una acción, no con una opinión — si al escribirlo sale
"revisar que se vea bien", el punto no cumple la Regla 1 y no entra.

---

## Sesión 6 · HECHA el 2026-09-07 · La causa raíz

`apps/courses/selectors.py` centraliza la lectura de cursos. Migradas seis vistas. Los 46 tests
previos siguieron pasando en cada paso, y el comportamiento de la API quedó idéntico salvo donde
había fuga.

**Encontró tres fugas que el P0 no cubría** — el detalle está en `docs/00-deuda.md`, punto 8.

Quedan sin migrar las otras siete apps (`quizzes`, `progress` salvo lo tocado, `qna`,
`certificates`, `blog`, `corporate`, `users`). El plan decía empezar por `courses` y `sections`, y
eso se hizo; ampliarlo ahora sería el mismo trabajo sin la urgencia que tenían estas.

---

## Sesión 6 · (original) P2 · La causa raíz

**Rama:** `refactor/service-layer` (desde `main`) · **Después de las sesiones 1 a 4**

`backend.capa_de_servicios: ninguna`. La lógica vive en 92 vistas. `aislamiento-de-datos` lo nombra
como causa, no como estilo:

> Toda lectura de un objeto por id pasa por un selector. Un `Model.objects.get(id=...)` directo en
> la vista es la forma canónica de saltarse el filtro. Un repo con `capa_de_servicios: ninguna`
> filtra mal por diseño, no por descuido.

El P0 es exactamente eso. Mientras el filtro de academia se repita vista por vista, va a volver a
faltar en alguna.

**Va al final a propósito:** refactorizar 92 vistas sin tests es cambiar un bug conocido por varios
desconocidos. Requiere las sesiones 1 a 4 hechas y tests en pie.

**Alcance sugerido:** empezar solo por `apps/courses` y `apps/sections`, con un `selectors.py` que
centralice el filtro de academia. No las nueve apps de golpe.

---

## Sesión 7 · HECHA el 2026-09-07 · Alojar los videos reales

**Lo que quedó listo, probado con 13 tests:**

- `apps/courses/video.py` firma la URL de Bunny en el servidor:
  `SHA256_HEX(clave + video_id + expires)`, con `expires` en segundos UNIX y vigencia de 10
  minutos. El formato se verificó contra la documentación de Bunny el 2026-09-07, y un test lo
  recalcula a mano: si alguien cambia el orden de concatenación, Bunny devolvería 403 en producción
  y el test lo dice antes.
- `GET /api/courses/lessons/{id}/video/` entrega la URL **solo a quien tiene acceso al curso**,
  usando la misma función que el detalle del curso para que no puedan divergir. Sin acceso: 404.
  Anónimo: 401.
- `VideoPreview` pide la URL al servidor en lugar de construirla, y la **renueva sola un minuto
  antes de que caduque** para que no se corte a mitad de la lección.
- YouTube se devuelve tal cual: sus videos son públicos y firmarlos no aporta nada.
- Un proveedor sin firma implementada (`mux`, `cloudflare`, `s3`) devuelve un error claro en vez de
  una URL que no reproduciría.

| Criterio | Resultado |
|---|---|
| Alumno sin acceso pide la URL | **404**, sin URL |
| Anónimo | **401** |
| Lección ajena vs inexistente | Mismo 404 |
| Alumno con acceso | 200 con `token=` y `expires=` |
| La clave de firma en el bundle | **No aparece** |
| YouTube sigue reproduciendo | Sí, sin cambios |
| Sin credenciales de Bunny | 501 con el motivo, no una URL rota |

**Lo que no pude hacer y te toca:**

1. Crear la cuenta en bunny.net y la librería de Stream — no puedo crear cuentas.
2. Activar **Embed View Token Authentication** en la librería.
3. Poner `BUNNY_STREAM_LIBRARY_ID` y `BUNNY_STREAM_TOKEN_KEY` en Railway.
4. Subir un video real y cambiar el `video_provider` de esa lección a `bunny`, con el id del video
   en `video_url`.

Hasta el paso 3, todo sigue funcionando con YouTube exactamente como hoy.

**Y un matiz que conviene entender antes de prometérselo al cliente:** una URL firmada **no impide
compartir el video durante su ventana de validez**. Impide el acceso permanente y la indexación.
Lo otro es DRM, cuesta 99 USD/mes en Bunny, y casi nunca vale la pena.

---

## Sesión 7 · (original) Alojar los videos reales

**Rama:** `feat/video-bunny` · **Antes de que lleguen los videos, no después**

Hoy el proveedor es YouTube con videos públicos. Van a llegar videos reales de CAMSA y necesitan
un sitio donde el acceso se pueda controlar.

### Recomendación: Bunny Stream

Precios consultados el 2026-09-03 en la documentación oficial de cada proveedor.

| | Bunny Stream | Cloudflare Stream |
|---|---|---|
| Almacenamiento | $0.01 / GB / mes | $5 por 1.000 minutos |
| Entrega | $0.010 / GB (Europa y Norteamérica) · $0.005 / GB en red Volume | $1 por 1.000 minutos |
| Codificación | Estándar incluida | Incluida |
| Mínimo | $1 / mes | Prepago en tramos de $5 |
| URLs firmadas | Sí, con token, incluido | Sí |
| DRM | $99 / mes — **no lo necesitas** | Aparte |

**El cálculo con tus números.** Asumo ~1 GB por hora vista, que es lo razonable con bitrate
adaptativo cuando parte de la audiencia ve en 720p. Si tus videos son de pantalla y voz —lo típico
de un curso clínico— pesan menos y sale más barato:

| Escenario | Bunny | Cloudflare |
|---|---|---|
| **Arranque:** 20 h de catálogo, 50 alumnos × 5 h/mes | **~$3 / mes** | ~$20 / mes |
| **Crecimiento:** 50 h de catálogo, 300 alumnos × 8 h/mes | **~$25 / mes** | ~$159 / mes |

La diferencia no es el precio de lista: es **la unidad de cobro**. Cloudflare cobra por minuto
entregado sin importar la calidad; Bunny cobra por GB. Un curso de voz y diapositivas pesa poco por
minuto, así que pagar por GB te favorece. Si algún día publicas video de alta producción, esa
ventaja se estrecha.

**Y hay una razón que no es el precio:** el código ya declara `bunny` como proveedor
(`backend/apps/courses/models.py:153`), así que el modelo de datos no cambia.

### Por qué NO Cloudflare R2, aunque tu perfil lo prefiera para archivos

R2 es almacenamiento de objetos. **No transcodifica ni genera HLS.** Servir un MP4 de 2 GB desde R2
significa que el alumno descarga el archivo entero a una sola calidad: con conexión mexicana
promedio, el video se corta. Video necesita bitrate adaptativo, y eso lo dan Stream y Bunny, no R2.
R2 sigue siendo la respuesta correcta para PDFs y materiales de apoyo.

**Mux** queda fuera por precio: es la opción de quien necesita analítica fina de reproducción y
está dispuesto a pagarla. No es tu caso hoy.

### El trabajo real de esta sesión no es elegir proveedor

Es **firmar las URLs**. Hoy `VideoPreview.jsx:16` hace esto para todo proveedor que no sea YouTube:

```javascript
if (['bunny', 'cloudflare', 'mux', 's3'].includes(provider)) {
  // usa la URL directamente como iframe src
}
```

URL directa, sin token, sin expiración. **Un video de pago servido así es público para cualquiera
que tenga la URL.** Y el P0 de la sesión 1 reparte exactamente esas URLs a usuarios anónimos.

Con YouTube público eso no hace daño. Con videos reales de CAMSA, sí.

### Alcance

1. Crear la librería en Bunny Stream y activar **Embed View Token Authentication**.
2. El token se firma **en el backend** (HMAC SHA256 sobre clave + id del video + expiración). La
   clave nunca llega al navegador.
3. Un endpoint que devuelva la URL firmada de una lección **solo si el usuario tiene acceso al
   curso**. La firma no sustituye al permiso: lo complementa.
4. `VideoPreview` consume la URL firmada en vez de construirla.
5. Expiración corta (minutos, no días) y renovación mientras se ve la lección.
6. Migrar los videos existentes, o dejar YouTube para los públicos y Bunny para los nuevos — el
   modelo soporta ambos por lección.

### Cómo lo verificamos aquí

| Criterio | Esperado |
|---|---|
| Pedir la URL firmada sin acceso al curso | **403 o 404**, sin URL |
| Abrir una URL firmada ya expirada | **403** de Bunny |
| Buscar la clave de firma en el bundle: `grep -r "token" cursos-maily/dist/` | **No aparece** |
| Un alumno con acceso ve la lección | Reproduce |
| Copiar la URL firmada a una ventana anónima antes de que expire | Reproduce — **y esto es esperado**: la firma acota el tiempo, no la persona |

Ese último criterio conviene entenderlo antes de prometer nada al cliente: **una URL firmada no
impide compartir el video durante su ventana de validez.** Impide el acceso permanente y la
indexación. Lo otro es DRM, cuesta $99/mes y casi nunca vale la pena.

### Antes de contratar

Verifica el precio en el panel de Bunny con tu propio consumo estimado. Los precios de arriba son
de su documentación el 2026-09-03 y pueden cambiar. Y **repercute este costo al cliente**: hoy no
lo haces con los ~$40/mes de Railway, y el video es el primer gasto que crece con el uso.

---

## Queda fuera de este plan

| Qué | Por qué | Cuándo |
|---|---|---|
| **26 `catch` vacíos** en 9 pantallas | Barrido mecánico, mucho diff y poco riesgo | Sesión propia, cuando quieras |
| **25 vulnerabilidades de npm**, 1 crítica (`jspdf`) | `npm audit fix` puede romper el build; necesita verificación pantalla por pantalla | Sesión propia |
| **`.gitattributes`** para CRLF/LF | El repo mezcla finales de línea; cualquier reescritura produce diffs falsos de miles de líneas | Media hora, junto a cualquier sesión |
| **Borrado lógico** | Cambio de esquema en `produccion`: arrastra datos reales | Necesita decisión de negocio primero |
| **CI** | Sin tests no hay nada que correr | Después de la sesión 1 |
| **Rotar la contraseña de Postgres** | No se puede comprobar desde el repo | Ya está en `docs/05-despliegue.md` |

---

## Orden y dependencias

```
Sesión 0 (decisiones)
   └─> Sesión 1 · P0 + andamio de pytest     ← primera, está en producción
         ├─> Sesión 2 · logout
         ├─> Sesión 3 · entrada y respuestas
         ├─> Sesión 4 · observabilidad
         └─> Sesión 6 · capa de servicios     ← al final, necesita tests

Sesión 5 · frontend  ← independiente del backend; espera mi auditoría
Sesión 7 · video     ← antes de que lleguen los videos reales; depende de la 1
```

Las sesiones 2, 3 y 4 son independientes entre sí: pueden ir en cualquier orden, o en paralelo con
`git worktree`. La 1 va primero porque monta el `pytest` que las demás usan.

---

## Qué significa que una sesión "cierra"

No cuando el código compila. Cuando:

1. Los criterios de su tabla se comprueban **provocando el efecto**, no leyendo el código.
2. Trae un test que **falla si se revierte el arreglo**.
3. `docs/00-deuda.md` marca ese punto como cerrado, con la fecha.
4. Si tocó una clave del perfil, el perfil quedó actualizado.
5. `MEMORIA.md` tiene su entrada.
6. Y si el arreglo enseñó una regla que sirve para otros repos, **sube al plugin** — no se queda
   aquí. Un punto nacido de un incidente que no llega a la biblioteca está garantizado que se
   repite en el siguiente proyecto.

Nada se despliega a producción hasta que su sesión cierre así en local.
