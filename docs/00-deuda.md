# Línea base de deuda

> Auditoría de adopción de la biblioteca. **Modo auditoría: no bloquea nada.**
> El estándar estricto aplica desde `proyecto.fecha_adopcion` (2026-09-02) hacia adelante; todo lo
> anterior es backlog priorizado. *Clean as you code.*
>
> Repo: `Maily-Academia` · Fecha: `2026-09-02` · Skills: `security-checklist`, `aislamiento-de-datos`
> Entorno: local (`docker compose`, backend en `:8020`), rama `chore/adoptar-biblioteca`

---

## Resumen

| Severidad | Cuántos |
|---|---|
| **P0** | 1 |
| **P1** | 6 |
| **P2** | 4 |
| PASA | 8 |
| NO VERIFICABLE | 5 → `docs/05-despliegue.md` |

---

## P0 · CERRADO el 2026-09-07 · rama `fix/course-catalog-isolation`

**Cómo se cerró.** `secciones_visibles_para(user)` en `backend/apps/courses/views.py` es ahora la
única fuente de verdad de qué academias ve cada quien, y la aplican tanto el listado como el
detalle. El detalle filtra por academia **antes** de buscar por id, así que el 404 sale solo: no
hace falta fingirlo, y un 403 habría confirmado que el curso existe.

Se separó **ver la vitrina** de **ver el contenido**: `CourseVitrinaSerializer` devuelve la ficha
con el temario completo y sin ningún `video_url`. Quien tiene acceso real sigue recibiendo el
detalle completo.

**Verificado el 2026-09-07**, con 7 tests y contra la API local:

| Criterio | Resultado |
|---|---|
| Anónimo, catálogo | Solo Longevity y Maily. Corporativo CAMSA no aparece en ninguna página |
| Anónimo, ficha con vitrina | 200, temario visible, **0 `video_url`** |
| Anónimo, curso de Corporativo | **404** ("No Course matches the given query") |
| Alumno de Longevity, curso suyo | 200 **con** `video_url` |
| Alumno sin membresía, curso de Corporativo | **404** |
| Instructor, sus cursos | 27, sin cambios |
| El test falla si se revierte el arreglo | Sí: 4 de 7 fallaban antes |

**Efecto medido:** un anónimo pasó de ver **26 cursos de las tres academias** a ver solo los de las
dos que tienen vitrina.

### Hallazgo de esta sesión: el deploy revertía la configuración de vitrina

`apps/sections/apps.py` enganchaba un `post_migrate` que hacía `update_or_create` de las tres
academias con **todos** sus valores por defecto, incluidas `allow_public_preview` y
`require_credentials`.

Eso significa que activar la vitrina de una academia desde el admin **duraba hasta el siguiente
deploy**. Ahora esas dos banderas solo se aplican al crear la academia por primera vez; el nombre y
la descripción se siguen actualizando. La política se decide en el admin, no en el código.

---

## P0 original (para referencia)

### El catálogo público expone academias con credenciales requeridas

**Punto:** `aislamiento-de-datos` — los datos de un ámbito no llegan a otro.

**Dónde:** `backend/apps/courses/views.py:61-63` (`get_permissions` devuelve `AllowAny` para GET) y
`backend/apps/courses/views.py:76-79` (el queryset del anónimo solo filtra `status='published'`,
nunca por sección ni por membresía). Lo mismo en `CourseDetailView`, `backend/apps/courses/views.py:183-186`.

**Cómo se comprobó (2026-09-02, sin ninguna credencial):**

```bash
curl -s "http://localhost:8020/api/courses/?page_size=100" | grep -o '"section_name":"[^"]*"' | sort | uniq -c
```

Local:

```
  Longevity 360: 14 cursos
  Maily Academia: 3 cursos          ← require_credentials=True
  Corporativo CAMSA: 3 cursos       ← require_credentials=True
```

Y el detalle completo de un curso corporativo, también sin credenciales:

```
GET /api/courses/6/  →  HTTP 200
  titulo   : Higiene y Bioseguridad en Clínica
  modulos  : 1 — "Protocolos básicos"
    · Lavado de manos clínico            | video: https://www.youtube.com/embed/8mAITcNt710
    · Uso de equipo de protección personal | video: https://www.youtube.com/embed/8mAITcNt710
```

**Confirmado en producción el mismo día.** `GET /api/courses/?page=2` sin credenciales devuelve
4 cursos de Corporativo CAMSA y 1 de Maily Academia.

**Qué pasaría en producción:** ya está pasando. Cualquiera con la URL del backend obtiene el
catálogo completo, la estructura de módulos y lecciones, y las URLs de los videos de las dos
academias que exigen credenciales. El control de acceso de `HasSectionAccess`
(`backend/apps/sections/permissions.py`) protege `/api/sections/{slug}/courses/`, pero `/api/courses/`
es la puerta de atrás y no lo aplica.

**Por qué se pasó por alto:** el aislamiento se implementó en el endpoint por academia, que es por
donde entra el frontend. El endpoint global quedó como catálogo público de la landing, y nadie
volvió a mirar que sirviera las tres academias.

---

## P1

### 1 · CERRADO el 2026-09-07 · Cerrar sesión ya cierra la sesión

`POST /api/auth/logout/` revoca el refresh, comprueba que el token pertenezca a quien lo presenta
—sin eso, cualquier usuario autenticado podría revocar la sesión de otro con solo tener su
refresh— y el frontend lo llama antes de limpiar el navegador.

**Verificado provocándolo**, que es lo que exige el punto 3 de `security-checklist`:

| Comprobación | Resultado |
|---|---|
| El refresh antes de cerrar sesión | 200 |
| El mismo refresh después de cerrar sesión desde la interfaz | **401 "El token está en lista negra"** |
| Cerrar sesión con el backend apagado | La sesión local se cierra igual, sin colgarse |
| Un usuario intentando revocar el refresh de otro | La sesión de la víctima sigue viva |
| Cerrar sesión dos veces | No revienta |

6 tests en `apps/users/tests/test_revocacion_de_sesion.py`. Los 6 fallaban antes.

---

### 1 · (original) Cerrar sesión no cierra la sesión

**Punto 3 de `security-checklist`** — la sesión se puede revocar de verdad.

`POST /api/auth/logout/` → **404**. El endpoint no existe (`backend/apps/users/urls.py:9-10`).
El `logout()` del frontend solo borra `sessionStorage` (`cursos-maily/src/context/AuthContext.jsx:146`).

La rotación sí revoca el refresh anterior (verificado: reusar uno rotado da 401 "El token está en
lista negra"), pero eso solo cubre el uso normal. **Un refresh token copiado sigue siendo válido
7 días y el usuario no tiene ninguna forma de invalidarlo.**

### 2 · La bitácora de auditoría no persiste

**Punto 26** — queda registro de quién vio o cambió qué.

`AuditLogMiddleware` hace `logger.info(...)` y nada más (`backend/apps/users/middleware.py:41-49`).
No escribe en base de datos. En Railway los logs se rotan.

La skill es explícita: *"Una bitácora que no se puede consultar por recurso y por actor no responde
la pregunta que la hace requisito: quién vio este expediente."*

### 3 · CERRADO el 2026-09-07 · Campos de texto sin límite

`LimitaTextoLibreMixin` en `apps/utils/limites_de_texto.py` recorre los campos del serializer al
construirse y pone un tope de **20 000 caracteres** a todo texto libre que no declare uno. Al ser
automático, un campo nuevo queda protegido sin que nadie se acuerde.

Se aplica en el serializer y no en el modelo **a propósito**: cambiar el modelo pide migración, y
aquí las corre solo Emanuel (`verificadores.migraciones: solo-emanuel`). Esto protege la vía por la
que entran los datos —la API— sin tocar el esquema.

Aplicado a 9 serializers de escritura: cursos, módulos, lecciones, materiales, blog, Q&A y
corporativo.

| Comprobación | Resultado |
|---|---|
| 1 MB en la descripción de un curso | **400** — "Este campo no puede superar los 20 000 caracteres" |
| 2 000 caracteres legítimos | **201** — el límite no estorba |

---

### 3 · (original) Campos de texto sin límite

**Punto 14** — ningún campo de texto es ilimitado.

Enviar 1 MB en `description` al crear un curso → **HTTP 201, se guardó**. `TextField` sin
`max_length` ni validación en el serializer (`backend/apps/courses/models.py:88`).

### 4 · Sin monitoreo de errores

**Punto 24.** `cumplimiento.monitoreo_errores: ninguno`. No hay Sentry ni equivalente. Hoy no
existe visibilidad de errores en producción: te enteras cuando un usuario avisa.

### 5 · Cero tests en el backend

`verificadores.tests_backend: ninguno`. No existe un solo archivo de test en `backend/apps/`.

Consecuencia directa sobre esta auditoría: **el punto 12 (cada fila de la matriz de roles tiene su
test) y el test de fuga de `aislamiento-de-datos` salen como NO VERIFICABLE**, no como PASA.

### 6 · CERRADO el 2026-09-07 · Datos personales sin `Cache-Control: no-store`

`NoGuardarDatosPersonalesMiddleware` marca como no almacenable **toda respuesta a una petición
autenticada**. La regla es amplia a propósito: si la petición trae credenciales, la respuesta es de
alguien. Lo público sigue siendo cacheable porque se pide sin autenticación.

Con este volumen de tráfico la caché no compra casi nada, y una fuga de perfil en una computadora
compartida —alguien pulsa "atrás" y ve el perfil del anterior— cuesta mucho más.

| Comprobación | Resultado |
|---|---|
| `GET /api/auth/me/` autenticado | `Cache-Control: no-store, no-cache, must-revalidate, private` |
| `GET /api/courses/` anónimo | Sin `no-store` — la caché pública sigue viva |

---

### 6 · (original) Datos personales sin `Cache-Control: no-store`

**Punto 18.** `GET /api/users/me/` responde solo con `Vary: origin`. Sin `Cache-Control`, un proxy
o el propio navegador puede conservar el perfil del usuario.

---

## P2

### 7 · CORREGIDO el 2026-09-07 · el hallazgo original estaba mal, y había otro peor

**Lo que reporté era un falso positivo.** `/api/users/{id}/` es solo de admin, así que su 403 es
correcto según la propia regla: *403 = tu rol no puede hacer esta acción*. Y lo comprobé: el 403 es
**idéntico** exista el usuario o no, así que no se puede enumerar nada.

**Pero buscando el caso real apareció uno peor.** `CertificateDownloadView` buscaba el certificado
por id y devolvía 403 si era de otra persona
(`apps/certificates/views.py:129`, antes del arreglo). Ese 403 sí confirmaba la existencia, y
permitía contar por enumeración de ids cuántos certificados hay emitidos y a cuántas personas.
Sobre un documento con el nombre completo de alguien, confirmar la existencia ya es información.

Arreglado filtrando el dueño **en la consulta** y no después, que es como ya lo hacía
`ReservationDetailView`. Así el 404 sale solo, sin fingirlo.

| Comprobación | Resultado |
|---|---|
| Certificado ajeno | **404** |
| Certificado inexistente | **404** — indistinguible del anterior |
| Certificado propio | 200 |
| `/api/users/{id}/` existente vs inexistente, como alumno | 403 y 403 — sin fuga |

---

### 7 · (original) 403 en vez de 404 sobre recurso ajeno

**Punto 10.** `GET /api/users/{id}/` de otro usuario devuelve **403**, no 404. Confirma que el
usuario existe, y permite contar usuarios por enumeración de ids.

### 8 · Sin capa de servicios

`backend.capa_de_servicios: ninguna`. No hay `services.py` ni `selectors.py` en ninguna app.

`aislamiento-de-datos` lo señala como causa raíz, no como estilo: *"Toda lectura de un objeto por id
pasa por un selector. Un `Model.objects.get(id=...)` directo en la vista es la forma canónica de
saltarse el filtro. Un repo con `capa_de_servicios: ninguna` filtra mal por diseño, no por
descuido."* El P0 de arriba es exactamente eso.

### 9 · Sin CI

`verificadores.ci: ninguno`. No hay `.github/workflows/`. Nada impide desplegar código que no
compila o que rompe el lint.

### 10 · Borrado físico en todo el repo

`backend.borrado: fisico`. Ningún modelo tiene `deleted_at`. Borrar un curso con progreso de alumnos
destruye el historial. Hoy `CourseDetailView.destroy` lo impide si hay inscripciones
(`backend/apps/courses/views.py:218-224`), pero es una defensa puntual, no un patrón.

---

## PASA (con evidencia)

| # | Punto | Evidencia |
|---|---|---|
| 6 | Las contraseñas débiles se rechazan | `12345678`, `password` y el propio correo → 400 |
| 7 | La fuerza bruta se detiene sola | Segundo login fallido → **429** |
| 5 | Contraseñas cifradas irreversiblemente | Hasher por defecto de Django, `AUTH_PASSWORD_VALIDATORS` con `min_length: 10` |
| 11 | El rol sale del servidor | `PATCH /api/users/me/` con `role: admin` → 404, la ruta no acepta ese cambio |
| 15 | La entrada no llega a la consulta | `search=%` y `search=_` → 0 resultados; `search=Relleno` → 22. Django escapa los comodines |
| 17 | El error no es un mapa del sistema | Producción devuelve un 404 sobrio, sin traza ni `DEBUG` |
| 21 | CORS no responde a origen ajeno | `Origin: https://atacante.example` → sin `Access-Control-Allow-Origin` |
| 20, 22 | Sin secretos versionados ni en el historial | `git ls-files \| grep '\.env$'` → vacío; `git log -S` de la contraseña de Postgres → sin coincidencias |

---

## NO VERIFICABLE → van a `docs/05-despliegue.md`

| Punto | Qué haría falta |
|---|---|
| 12 · Cada fila de la matriz de roles tiene test | No hay `proyecto.contrato` ni tests |
| Test de fuga de `aislamiento-de-datos` | `verificadores.tests_backend: ninguno` |
| 16 · Un archivo no es lo que dice su extensión | Requiere probar subida real contra Cloudinary; no se hizo para no escribir en la cuenta de producción |
| 23, 25 · Datos sensibles en logs y notificaciones | Requiere provocar errores y notificaciones reales |
| 19 · La app no arranca sin sus secretos | Requiere levantar sin `SECRET_KEY` en el entorno de Railway |

---

## Nota sobre el alcance de esta auditoría

Se corrió sobre la rama `chore/adoptar-biblioteca`, que sale de `main`. **La rama
`fix/student-course-visibility` está sin fusionar** y cambia dos cosas de este informe:

- Añade `search_fields` a `SectionCoursesView`. Durante la auditoría ese endpoint **ignoraba el
  parámetro `search` por completo** — un `search=xyzzy` devolvía los 27 cursos. No es una fuga por
  comodín (Django escapa bien), es un filtro que no existía en `main`.
- Añade validación al publicar, que cubre parte del punto 13.

Ninguna de las dos toca el P0.
