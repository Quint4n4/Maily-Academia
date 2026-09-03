# PERFIL DEL REPO

> Único lugar donde viven los hechos locales. Ninguna skill de la biblioteca menciona una ruta,
> una librería, un campo ni una app: todas las piden aquí.
>
> Repo: `Maily-Academia` · Última actualización: `2026-09-02`

**`CLAUDE.md` apunta aquí y no repite ni un valor. Si difieren, gana este archivo.**

Los valores marcados **[propuesto]** los deduje del código citando `archivo:línea`. **No están
decididos hasta que Emanuel los confirme.** Un valor deducido se ve igual que uno decidido, y la
siguiente revisión lo hereda como si alguien lo hubiera pensado.

---

## 1 · Proyecto

| Clave | Valor | Evidencia |
|---|---|---|
| `proyecto.nombre` | Maily Academia | — |
| `proyecto.etapa` | `produccion` | Desplegado y en uso: `maily-academia-production-de9b.up.railway.app` sirve 26 cursos reales |
| `proyecto.fecha_adopcion` | `2026-09-02` | Día en que se corrió el paso 5 |
| `proyecto.raiz_backend` | `backend/` | `backend/manage.py` |
| `proyecto.raiz_frontend` | `cursos-maily/` | `cursos-maily/package.json:1` |
| `proyecto.contrato` | `ninguno` | No existe `docs/02-contrato.md`; el repo se construyó antes del proceso |

`proyecto.etapa: produccion` no es decorativa: obliga a `db-schema` a declarar qué pasa con los
datos existentes antes de proponer un cambio de esquema.

---

## 2 · Aislamiento

| Clave | Valor | Evidencia |
|---|---|---|
| `aislamiento.ambito` | `sede` | Ver nota de abajo |
| `aislamiento.nombre_de_negocio` | **academia** (3: Maily Academia, Longevity 360, Corporativo CAMSA) | `backend/apps/sections/models.py` |
| `aislamiento.campo` | `section` | `backend/apps/courses/models.py:78` (Course), `:22` (Category) |
| `aislamiento.mecanismo` | `manual-por-vista` | No hay manager filtrado; cada vista filtra a mano — p. ej. `backend/apps/sections/views.py:89` |
| `aislamiento.modelo_base` | `ninguno` | Ningún modelo hereda de una base con ámbito |
| `aislamiento.escape` | `ninguno` | No hay manager sin filtro porque no hay manager filtrado |
| `aislamiento.origen` | `tabla-de-membresias` | `SectionMembership` en `backend/apps/sections/models.py:44` |
| `aislamiento.test_de_fuga` | `ninguno` | No existe ningún test en el backend |
| `aislamiento.ancla` | `AMBITO>>` — comentario a poner en cada vista que filtra por academia | Con `manual-por-vista` el ancla es lo único que hace repetible la auditoría, y no existe |

### Por qué `sede` y no `tenant`

Una sola base, un solo dominio, un solo despliegue. Las tres academias son unidades del mismo
negocio, no clientes distintos. Es el mismo patrón que multi-sucursal, así que `sede`.

### Lo que este repo NO encaja con `aislamiento-de-datos` — para el camino de subida

**Solo 2 de 36 modelos llevan el campo de ámbito.** `Category` y `Course` tienen FK a `Section`.
Los otros 34 (quizzes, progress, qna, blog, certificates, corporate) **derivan el ámbito
recorriendo relaciones hasta llegar a `Course`**, o no lo tienen en absoluto.

La skill `aislamiento-de-datos` supone que el ámbito es un campo presente en los modelos. Aquí es
una propiedad **derivada por relación**, que es un mecanismo distinto y más frágil: cada vista debe
hacer el join correcto, y una que lo olvide filtra sin que nada lo detecte.

Este es el hueco que Emanuel pidió atender. Sale de esta adopción hacia el camino de subida.

### Excepción declarada del modelo de acceso

Las secciones con `section_type=public` (hoy: Longevity 360) **dan acceso a cualquier usuario
autenticado, tenga membresía o no**. Está escrito a propósito en
`backend/apps/sections/permissions.py:12-13`. Verificado provocándolo: `estudiante1`, sin membresía
en Longevity, recibe 200 y los cursos. Ver excepción E1.

---

## 3 · Backend

| Clave | Valor | Evidencia |
|---|---|---|
| `backend.framework` | Django 5.1 + DRF 3.15 | `backend/requirements.txt:1-2` |
| `backend.forma_de_vistas` | `apiview-y-path` | 92 usos de `generics.`/`APIView`, 0 ViewSets ni routers |
| `backend.capa_de_servicios` | `ninguna` | No existe `services.py` ni `selectors.py` en ninguna app; la lógica vive en las vistas |
| `backend.envoltura_respuesta` | `drf-plano` | `backend/config/settings.py:150`; sin envoltura propia salvo dos vistas de analytics |
| `backend.paginacion` | `drf: count/next/previous` — `PAGE_SIZE: 20` | `backend/config/settings.py:156-157` |
| `backend.autenticacion` | `jwt` | `backend/config/settings.py:150-152` (simplejwt) |
| `backend.revocacion_de_sesion` | `si: rotación + blacklist` — **pero no hay logout** | Ver nota |
| `backend.borrado` | `fisico` | Ningún modelo tiene `is_deleted` ni `deleted_at` |
| `backend.bitacora_auditoria` | `AuditLogMiddleware` — **no persiste** | `backend/apps/users/middleware.py:25` |
| `backend.tareas_asincronas` | `ninguna — en el hilo de la petición` | No hay Celery en el repo |

### `revocacion_de_sesion`: rellenado provocando el efecto, no leyendo `settings.py`

`ROTATE_REFRESH_TOKENS` y `BLACKLIST_AFTER_ROTATION` están en `True`
(`backend/config/settings.py:178-179`) y `token_blacklist` sí está instalado (`:43`).

Provocado el 2026-09-02:

- Reusar un refresh ya rotado → **401 "El token está en lista negra"**. La rotación revoca. ✅
- `POST /api/auth/logout/` → **404. El endpoint no existe.** `backend/apps/users/urls.py:9-10` solo
  declara `login/` y `refresh/`.
- El `logout()` del frontend solo borra `sessionStorage`
  (`cursos-maily/src/context/AuthContext.jsx:146`).

**Consecuencia: cerrar sesión no cierra la sesión.** El refresh token sigue siendo válido en el
servidor hasta que expire (7 días). Quien tenga una copia de ese token conserva el acceso aunque el
usuario haya cerrado sesión, y el usuario no tiene forma de invalidarlo.

### `bitacora_auditoria`: existe el nombre, no la bitácora

`AuditLogMiddleware` hace `logger.info(...)` y nada más
(`backend/apps/users/middleware.py:41-49`). **No escribe en base de datos.** En Railway los logs se
rotan, así que no hay registro consultable de quién hizo qué. Un modelo con nombre de auditoría que
no persiste es peor que no tenerlo: aprueba el punto sin cumplirlo.

---

## 4 · Frontend

| Clave | Valor | Evidencia |
|---|---|---|
| `frontend.apps` | `cursos-maily — alumnos, instructores y admin (una sola SPA) — cursos-maily/` | `cursos-maily/src/App.jsx` |
| `frontend.estado_servidor` | `ninguno — axios + useState/useEffect` | Sin TanStack Query ni react-query en el repo |
| `frontend.estilos` | `tailwind` | `cursos-maily/tailwind.config.js` |
| `frontend.cliente_http` | `cursos-maily/src/services/api.js` | Los 16 servicios restantes importan de ahí; ninguno hace peticiones por su cuenta |
| `frontend.libreria_http` | `axios` | `cursos-maily/src/services/api.js:1,26` |
| `frontend.almacen_token` | `sessionStorage` | `cursos-maily/src/services/api.js:6-7,12-13` |
| `frontend.cache_offline` | `ninguna` | Sin localforage, idb ni persistencia de queries |
| `frontend.transporte_del_ambito` | `parametro` — el slug va en la ruta | `courseService.listBySection` → `/sections/{slug}/courses/` |
| `frontend.matriz_de_permisos` | `ninguna` | No existe archivo de matriz; los guards viven sueltos en `App.jsx` |
| `frontend.espejo_de_modulos` | `ninguno` | No existe |
| `frontend.temas` | `claro-y-oscuro` | `cursos-maily/src/context/ThemeContext.jsx` |
| `frontend.paleta` | `cursos-maily/tailwind.config.js` | Ahí se corrige un color de marca en un solo sitio |
| `cumplimiento.nivel_accesibilidad` | `ninguno` — nunca se fijó un objetivo | Ver `docs/07-auditoria-frontend.md` |

`frontend.estado_servidor: ninguno` **no** vuelve `N/A` el cruce de caché de `auditoria-frontend`:
sin caché de servidor, el dato de la academia anterior sobrevive en el estado de los componentes.
Es el mismo riesgo en otro sitio.

---

## 5 · Verificadores

| Clave | Valor | Evidencia |
|---|---|---|
| `verificadores.entorno` | `docker compose exec -T backend` | `docker-compose.yml` |
| `verificadores.tests_backend` | `ninguno` | **No existe un solo test en `backend/apps/`** |
| `verificadores.tests_frontend` | `ninguno` | No hay vitest, jest ni testing-library |
| `verificadores.tipos` | `ninguno` | El frontend es `.jsx` sin TypeScript; el backend no tiene mypy |
| `verificadores.lint` | `cd cursos-maily && npm run lint` (solo frontend) | `cursos-maily/package.json`; el backend no tiene lint configurado |
| `verificadores.ci` | `ninguno` | No hay `.github/workflows/` |
| `verificadores.migraciones` | `solo-emanuel` | Confirmado por Emanuel el 2026-09-03 |

> **`tests_backend: ninguno` es la clave más cara de este perfil.** Todo punto de cualquier skill
> cuyo verificador sea un test sale como `NO VERIFICABLE` y se acumula en `docs/05-despliegue.md`.
> Eso es una lectura correcta del estado del repo, no un fallo del checklist — pero significa que
> hoy la mayor parte del checklist de seguridad no se puede contestar.

---

## 6 · Cumplimiento

| Clave | Valor | Evidencia |
|---|---|---|
| `cumplimiento.datos_sensibles` | `si: datos de alumnos identificables` | Nombre, email, avatar, progreso académico, certificados con nombre; y `stripe_customer_id` en `apps/users` |
| `cumplimiento.monitoreo_errores` | `ninguno` | Sin Sentry ni equivalente en `requirements.txt` |
| `cumplimiento.registros_inmutables` | `ninguno` | Los certificados deberían serlo y hoy no hay nada que lo impida |
| `cumplimiento.estados_con_razon` | `ninguna` | No hay transiciones que exijan razón |
| `cumplimiento.consulta_legal` | `pendiente` | Nunca se ha hecho |

`consulta_legal: pendiente` significa que `security-checklist` **no tiene puntos legales**. No
significa que no apliquen: hay datos personales de alumnos y pagos con Stripe. Los requisitos
legales se consultan una vez con un abogado y el resultado se convierte en puntos fijos de la skill.

---

## 7 · Excepciones locales

Una desviación documentada aquí **pasa**. Una no documentada **bloquea**.

| # | Qué regla se desvía | Por qué | Qué la volvería a hacer aplicable |
|---|---|---|---|
| E1 | `aislamiento-de-datos`: el acceso a una academia exige membresía | Las secciones `public` (Longevity 360) dan acceso a cualquier autenticado, a propósito, mientras no se creen las membresías. Declarado en `backend/apps/sections/permissions.py:12-13` | Cuando Longevity 360 tenga membresías explícitas, se borra esta excepción y el punto vuelve a aplicar |

---

## Decisiones confirmadas por Emanuel el 2026-09-03

Las seis claves que estaban `[propuesto]` quedaron decididas. Ninguna es ya una suposición.

| Clave | Valor decidido |
|---|---|
| `proyecto.etapa` | `produccion` |
| `aislamiento.ambito` | `sede` — el ámbito es la academia |
| `aislamiento.ancla` | `AMBITO>>`, a poner como comentario en cada vista que filtra por academia |
| `verificadores.migraciones` | `solo-emanuel` — ningún agente corre `makemigrations` ni `migrate` |
| `cumplimiento.datos_sensibles` | `si: datos de alumnos identificables` |
| `cumplimiento.registros_inmutables` | `ninguno` |

### Vitrina pública: decidida el 2026-09-03

**El catálogo se ve sin iniciar sesión.** Emanuel lo quiere como vitrina para captar alumnos.

Eso **no** significa exponer el contenido. La frontera es:

| Un anónimo SÍ ve | Un anónimo NO ve |
|---|---|
| Título, descripción, imagen, nivel, duración, precio, instructor | `video_url` de ninguna lección |
| Cuántas lecciones y cuántos alumnos tiene | Los materiales de apoyo |
| El temario: títulos de módulos y de lecciones | El progreso ni los datos de ningún alumno |

Los campos de `CourseListSerializer` (`apps/courses/serializers.py:136-147`) ya son exactamente
esa vitrina: no incluyen módulos ni videos. El problema está en `CourseDetailSerializer` (`:157`),
que anida `modules → lessons → video_url`.

**Qué academias tienen vitrina** — confirmado por Emanuel el 2026-09-03. Se controla con
`allow_public_preview` por academia, no en el código:

| Academia | `allow_public_preview` | Por qué |
|---|---|---|
| Longevity 360 | `True` | Academia abierta de salud: es la que capta alumnos |
| Maily Academia | `True` | Es el producto; su catálogo vende |
| Corporativo CAMSA | `False` | Onboarding interno de empleados. Su catálogo no le sirve a nadie de fuera |

---

## 8 · Video

| Clave | Valor | Evidencia |
|---|---|---|
| Proveedores declarados en el modelo | `youtube`, `bunny`, `cloudflare`, `mux`, `s3` | `backend/apps/courses/models.py:153-158` |
| Proveedor en uso hoy | `youtube` (videos públicos) | Confirmado por Emanuel el 2026-09-03 |
| Protección de la URL de video | **ninguna** | `cursos-maily/src/components/VideoPreview.jsx:16` — para todo proveedor que no sea YouTube usa la URL directa como `src` del iframe, sin token ni firma |

> **Esta última fila es la que importa cuando lleguen los videos reales.** Hoy no hay daño porque
> los videos son públicos en YouTube. Un video de pago servido por URL directa sin firmar es
> público para cualquiera que tenga la URL, y el P0 de `docs/00-deuda.md` reparte exactamente esas
> URLs a usuarios anónimos.
