# MEMORIA

> Bitácora del repo: qué pasó, cuándo y qué quedó abierto. Una entrada por sesión de trabajo.
> Lo que el cliente podría leer va en Notion; esto es para quien tenga el código enfrente.

---

## 2026-09-15 · DESPLEGADO a produccion

Las siete sesiones de correccion estan en produccion y verificadas. Lo que cambio, medido
contra la API publica:

| | antes | ahora |
|---|---|---|
| Cursos visibles a un anonimo | 26, de las tres academias | 22, solo de las que tienen vitrina |
| Corporativo CAMSA a un anonimo | 4 cursos | **0** |
| POST /api/auth/logout/ | 404 | 401 (existe y revoca) |
| Ficha publica de un curso | traia las URLs de video | temario completo, **0 video_url** |

### Como se desplego, y los tres tropiezos

**El repo local no tenia remoto.** Se habia creado con `git init` el 2026-09-02 sobre una
copia de la carpeta, asi que su historia no tenia ancestro comun con la de
`Quint4n4/Maily-Academia`, que es de donde despliega Railway. Se unieron con un merge
`--allow-unrelated-histories` en vez de forzar el push: los 20 commits de febrero y marzo
siguen ahi. **El repo local ya quedo conectado a `origin/main`**, asi que esto no se
repite.

**El push fallo la primera vez.** `gh` tenia dos cuentas y estaba activa
`EmanuelRealGamboa`, que no tiene permiso de escritura en el repo. Se cambio a `Quint4n4`
para el push y se restauro la cuenta activa despues.

**El primer despliegue del backend fallo en el healthcheck.** Build y deploy pasaron, la
migracion 0009 se aplico --la tabla existe-- y aun asi el servicio no entro a servir. La
causa: `healthcheckPath` apuntaba a `/admin/`, que responde 302, y `SECURE_SSL_REDIRECT`
convertia ese 302 en un 301 hacia el dominio publico, que desde la red interna de Railway
no resuelve.

Se arreglo de dos formas: `SECURE_SSL_REDIRECT=False` como variable, y el healthcheck
pasa a `/api/sections/`, que responde 200 sin redirigir y de paso comprueba que la base
responde. **Railway hizo lo correcto**: se nego a promover un contenedor que no respondia
y dejo el viejo sirviendo, asi que el sitio nunca se cayo.

### Un cambio que esta en produccion y no en el repo

`allow_public_preview` de Longevity 360 se activo **con un UPDATE directo a la base**, a
peticion de Emanuel. No paso por la API, asi que **no quedo en la bitacora de auditoria**.
Si algun dia se restaura un backup anterior al 2026-09-15, esa casilla vuelve a cero y el
catalogo de Longevity desaparece sin que nada lo explique.

## 2026-09-07 · Sesion 6: capa de selectores

`apps/courses/selectors.py` es la puerta unica por la que se lee un curso. Migrados el
listado, el detalle, el catalogo por academia, los recomendados, la inscripcion y el video.
Los 46 tests que ya existian siguieron pasando en cada paso: esa era la red que hacia
posible el refactor, y por eso esta sesion iba al final.

**Encontro tres fugas que el P0 no cubria**, todas de la misma clase: el filtro estaba en
unas vistas y faltaba en las de al lado.

- `EnrollView`: un alumno se inscribia en un curso de otra academia sabiendo el id (201).
- `RecommendedCoursesView`: recomendaba cursos de academias cerradas; la academia solo se
  acotaba si el cliente mandaba ?section=, o sea, la decidia el cliente.
- `CourseProgressView`: un id inexistente daba 500.

Es exactamente lo que decia `aislamiento-de-datos`: un repo sin capa de selectores filtra
mal por diseno, no por descuido. Cerrar el P0 en la lectura no bastaba.

## 2026-09-07 · Sesion 7: video firmado

La URL de video ya no se construye en el navegador: se pide a
`/api/courses/lessons/{id}/video/`, que comprueba el acceso al curso y firma la URL de
Bunny en el servidor. La clave nunca sale del backend. YouTube se devuelve tal cual
porque sus videos son publicos.

El formato de la firma --SHA256(clave + video_id + expires)-- se verifico contra la
documentacion de Bunny, y hay un test que lo recalcula a mano: si alguien cambia el orden
de concatenacion, Bunny daria 403 en produccion y el test avisa antes.

**Falta lo que no puedo hacer yo:** crear la cuenta de Bunny, activar Token
Authentication y poner las dos variables en Railway. Hasta entonces todo sigue con
YouTube igual que hoy.

Matiz para no prometer de mas: una URL firmada no impide compartir el video mientras
dure. Impide el acceso permanente y la indexacion.

## 2026-09-07 · Sesion 4: observabilidad

La bitacora ya persiste: modelo `RegistroDeAuditoria`, consultable desde el admin en solo
lectura, con indices por actor y por recurso. Guarda el correo del actor ademas de su id
para que el registro sobreviva al borrado del usuario.

Sentry configurado pero **desactivado hasta que haya SENTRY_DSN**. Lo que importa no es
el alta del servicio sino los filtros: un SDK sin configurar manda el cuerpo de la
peticion, las cookies y las variables locales de la traza, donde vive la contrasena que
causo el error.

**Primera migracion de estas sesiones.** Emanuel autorizo correrla solo en local; en
produccion la corre el. Anotada en docs/05-despliegue.md como D8.

## 2026-09-07 · Sesion 3: endurecer entrada y respuestas

Tres puntos cerrados: limite de 20 000 caracteres en texto libre (mixin en el serializer,
no en el modelo, para no pedir migracion), `Cache-Control: no-store` en toda respuesta
autenticada, y 404 en vez de 403 sobre un certificado ajeno.

**Un hallazgo del informe estaba mal.** Reporte que `/api/users/{id}/` filtraba
existencia con su 403; no es cierto, el 403 es identico exista el usuario o no, y ademas
es el correcto porque ese endpoint es solo de admin. Buscando el caso real aparecio uno
peor: la descarga de certificados si confirmaba la existencia de documentos ajenos.

La leccion: antes de arreglar un 403, comprobar si distingue. Un 403 que responde igual
para lo que existe y lo que no, no filtra nada.

## 2026-09-07 · Sesion 2: cerrar sesion de verdad

`POST /api/auth/logout/` no existia. Ahora revoca el refresh y comprueba que sea de quien
lo presenta. El frontend lo llama antes de limpiar el navegador, y si el servidor no
responde cierra la sesion local igual: un logout que se cuelga deja al usuario dentro de
la sesion que acaba de pedir cerrar, justo en una computadora prestada.

Verificado desde la interfaz: el refresh pasa de 200 a 401 "El token esta en lista negra".

De paso salio un problema de infraestructura de tests: el limite de intentos de login se
acumulaba entre tests y los hacia fallar en conjunto aunque pasaran aislados. El conftest
limpia el cache antes de cada test.

## 2026-09-07 · Fusion de las tres ramas y cierre del P0

Las tres ramas entraron a `main` con `--no-ff`. Un solo conflicto, en
`CoursesList.jsx`, resuelto combinando: una rama traía `Pagination` y la otra
`CourseThumbnail`, y el contador usaba un nombre de variable que la otra rama había
renombrado.

**P0 cerrado** en `fix/course-catalog-isolation`. El backend estrena `pytest` —no tenía
ningún test— con 7 casos de fuga entre academias. Un anónimo pasó de ver 26 cursos de
las tres academias a ver solo los de las dos con vitrina.

Salió un hallazgo que no estaba en la auditoría: el `post_migrate` de
`apps/sections/apps.py` **revertía la configuración de vitrina en cada deploy**, porque
hacía `update_or_create` con todas las banderas. Activar la vitrina desde el admin
duraba hasta el siguiente despliegue.

**Pendiente antes de desplegar:** activar `allow_public_preview` en Longevity 360 desde
el admin de producción. En local ya está.

## 2026-09-03 · Auditoría de interfaz y skill nueva

`docs/07-auditoria-frontend.md`: 4 P1, 5 P2, 3 P3, todos medidos. Lo peor es texto negro sobre fondo
oscuro con ratio 1.43 en el constructor y en el panel del instructor, por falta de la variante
`dark:`; y el dorado de marca con texto negro (3.25 en tres pantallas), que se arregla poniendo el
texto en blanco (6.46).

**Esta sesión sí tocó el plugin.** Nació `revision-de-interfaz` (biblioteca v1.2.0, rama
`feat/skill-revision-de-interfaz`), con sus diecisiete puntos sacados de los defectos de aquí, más
`verificador.js`. Se agregaron tres claves a la plantilla del perfil: `frontend.temas`,
`frontend.paleta` y `cumplimiento.nivel_accesibilidad`.

El verificador encontró 12 fallos en `/instructor/dashboard`, una pantalla que la pasada manual no
había recorrido.

## 2026-09-02 · Adopción de la biblioteca de skills

**Este repo adoptó la biblioteca** (`biblioteca-de-skills@biblioteca-emanuel`).
`proyecto.fecha_adopcion: 2026-09-02`.

- Se creó `.claude/PERFIL-DEL-REPO.md`. **Seis claves quedaron `[propuesto]`** y están listadas al
  final de ese archivo con lo que apaga cada una. Hasta confirmarlas, las skills las tratan como
  huecos.
- `.cursor/agents/` se archivó en `.claude/_archivo/agentes-cursor/`. Ya había divergido del repo.
- Línea base en `docs/00-deuda.md`: **1 P0, 6 P1, 4 P2**.

**No se tocó ninguna skill del plugin en esta sesión.** Sí salió material para el camino de subida:
`aislamiento-de-datos` supone que el ámbito es un campo en los modelos, y aquí solo 2 de 36 modelos
lo tienen — los otros 34 derivan el ámbito recorriendo relaciones hasta `Course`. Ese caso no está
cubierto por la skill. Anotado en el perfil, §2.

### Lo urgente que salió

**P0 — el catálogo público expone academias con credenciales requeridas.** `GET /api/courses/` y
`/api/courses/{id}/` tienen `AllowAny` y solo filtran por `status`. Un anónimo obtiene módulos,
lecciones y URLs de video de Corporativo CAMSA. **Confirmado también en producción.** Sin arreglar.

## 2026-09-02 · Los alumnos no veían los cursos nuevos

Rama `fix/student-course-visibility`, **sin fusionar**.

Dos fallas encadenadas: los `.annotate()` descartaban el `Meta.ordering` y el SQL salía sin
`ORDER BY`, así que el curso más nuevo caía al final; y el catálogo del alumno no paginaba, con lo
que los cursos 21 en adelante eran invisibles para todos.

De ahí salió una regla que vale para cualquier repo: **todo queryset paginado lleva `.order_by()`
explícito**, aunque el modelo declare `Meta.ordering`. Candidata a subir a `django-backend`.

## 2026-09-02 · El repo entró en git

Antes no tenía historia. La contraseña de Postgres estaba escrita en `docker-compose.yml`; se sacó
a una variable **antes** del primer commit, así que no quedó en el historial. **Rotarla igual** si
se usa en otro sitio.

Puertos locales: backend `8020`, Postgres `5435`. Los 8000 y 5432 los ocupa MailySoft.
