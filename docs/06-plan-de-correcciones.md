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

## Sesión 0 · Decisiones tuyas (aquí, sin código)

Seis claves del perfil están marcadas `[propuesto]`: las deduje del código y **se ven idénticas a
las decididas**. Si no las confirmas, cada sesión que las consulte hereda una suposición con
formato de hecho.

| Clave | Propuesto | Qué cambia si es otro valor |
|---|---|---|
| `proyecto.etapa` | `produccion` | En `desarrollo`, `db-schema` no exige plan de datos al cambiar el esquema |
| `aislamiento.ambito` | `sede` | Con `ninguno`, `aislamiento-de-datos` se declara `N/A` y el P0 deja de ser P0 |
| `aislamiento.ancla` | sin definir | Con `manual-por-vista` y sin ancla, la auditoría vista por vista no es repetible |
| `verificadores.migraciones` | `solo-emanuel` | Decide si una sesión puede correr `migrate` sola |
| `cumplimiento.datos_sensibles` | `si: datos de alumnos` | Con `ninguno`, la §5 entera de `security-checklist` se apaga |
| `cumplimiento.registros_inmutables` | `ninguno` | Decide si los certificados emitidos se pueden editar |

**Y una pregunta de negocio que decide el arreglo del P0:**

> ¿El catálogo de cursos debe ser visible **sin iniciar sesión**, para captar alumnos?

Los datos para decidir:

- Hoy **ninguna** de las tres academias tiene `allow_public_preview=True`.
- **Ninguna página pública del frontend consume `/api/courses/`.** `LandingHub` y `AcademyLanding`
  son estáticas: no importan ni un servicio.
- Los ocho consumidores de ese endpoint son pantallas autenticadas: `admin/CourseManagement`,
  `instructor/*`, `MyCourses`.

**Conclusión: cerrar el acceso anónimo no rompe nada hoy.** Si más adelante quieres catálogo
público, el mecanismo correcto ya está construido y sin usar: `allow_public_preview` en `Section`,
`CanViewSectionPreview` y `/api/sections/{slug}/preview/`.

**Tercera pregunta, y esta es de daño real:** ¿los videos de YouTube de los cursos corporativos son
públicos, o *no listados*? Si son no listados, la URL **es** la llave, y hoy está expuesta a
cualquiera. Si son públicos, la fuga es de títulos y estructura, que es menos grave. Compruébalo en
tu cuenta de YouTube antes de la sesión 1.

---

## Sesión 1 · P0 · Cerrar la fuga entre academias

**Rama:** `fix/course-catalog-isolation` (desde `main`) · **Prioridad: primera, sin discusión**

Está en producción y expone contenido de Corporativo CAMSA, que es tu empleador.

### Alcance

- `CourseListCreateView.get_queryset` y `CourseDetailView.get_queryset`
  (`backend/apps/courses/views.py:70` y `:193`): el anónimo solo ve cursos de secciones con
  `allow_public_preview=True`; el autenticado, solo los de las academias donde tiene acceso.
- **Reutilizar lo que existe.** No inventar un mecanismo nuevo: `allow_public_preview` y
  `CanViewSectionPreview` ya están escritos.
- Montar `pytest` + `pytest-django` (hoy no hay **ningún** test) y escribir el **test de fuga**:
  un anónimo y un usuario sin membresía piden un curso de una academia cerrada y reciben 404.
- 404, no 403: un 403 confirma que el curso existe.

### Fuera de alcance

El refactor a capa de servicios. Es la causa raíz, pero mover 92 vistas sin tests es temerario.
Va en la sesión 6.

### Prompt de arranque

```
Lee .claude/PERFIL-DEL-REPO.md y docs/00-deuda.md (sección P0), y carga las skills
protocolo-de-revision, aislamiento-de-datos y django-backend.

Cierra el P0: GET /api/courses/ y GET /api/courses/{id}/ tienen AllowAny y su
queryset solo filtra status='published', nunca por seccion ni membresia. Un
anonimo obtiene modulos, lecciones y URLs de video de academias con
require_credentials=True.

Reutiliza el mecanismo que ya existe (allow_public_preview, CanViewSectionPreview);
no inventes uno nuevo. Devuelve 404, no 403.

Monta pytest + pytest-django y escribe el test de fuga. Hoy el repo no tiene
ningun test: ese andamio lo usan las sesiones siguientes.

Rama fix/course-catalog-isolation desde main. No toques el frontend.
```

### Cómo lo verificamos aquí

```bash
curl -s "http://localhost:8020/api/courses/?page_size=100" | grep -o '"section_name":"[^"]*"' | sort -u
```

| Criterio | Esperado |
|---|---|
| Anónimo pide el catálogo | Solo secciones con `allow_public_preview=True` → hoy, **ninguna** |
| Anónimo pide `/api/courses/6/` (corporativo) | **404** |
| `estudiante1` (sin membresía en Longevity) pide un curso de Longevity | 200 — es la excepción E1 del perfil, es `public` |
| `estudiante2` pide un curso de Corporativo | **404** |
| Instructor sigue viendo sus propios cursos | 200 |
| Las 8 pantallas autenticadas siguen funcionando | Sin regresión visible |
| El test de fuga existe y pasa | `pytest` verde |
| El test de fuga **falla** si se revierte el arreglo | Prueba de que el test sirve |

Ese último criterio es el que separa un test de un adorno.

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

## Sesión 6 · P2 · La causa raíz

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
