# Plan de Implementación - Reestructuración Maily Academia

> **Fecha de creación:** 4 de marzo de 2026  
> **Proyecto:** Maily Academia → Plataforma Multi-Sección  
> **Stack tecnológico:** Django 5.1 + DRF (backend) | React 19 + Vite (frontend) | PostgreSQL | JWT

---

## Tabla de Contenidos

1. [Estado Actual del Proyecto](#1-estado-actual-del-proyecto)
2. [Visión General de la Reestructuración](#2-visión-general-de-la-reestructuración)
3. [Arquitectura Objetivo](#3-arquitectura-objetivo)
4. [FASE 1 - Arquitectura Multi-Sección (Fundación)](#fase-1---arquitectura-multi-sección-fundación)
5. [FASE 2 - Mejoras en Registro y Perfil de Usuario](#fase-2---mejoras-en-registro-y-perfil-de-usuario)
6. [FASE 3 - Sistema de Categorías](#fase-3---sistema-de-categorías)
7. [FASE 4 - Material de Apoyo en Cursos](#fase-4---material-de-apoyo-en-cursos)
8. [FASE 5 - Quizzes Interactivos Avanzados](#fase-5---quizzes-interactivos-avanzados)
9. [FASE 6 - Exámenes Finales Avanzados](#fase-6---exámenes-finales-avanzados)
10. [FASE 7 - Panel Avanzado del Instructor](#fase-7---panel-avanzado-del-instructor)
11. [FASE 8 - Analytics de Administrador](#fase-8---analytics-de-administrador)
12. [Resumen de Fases y Estimación](#resumen-de-fases-y-estimación)
13. [Dependencias entre Fases](#dependencias-entre-fases)
14. [Glosario de Términos](#glosario-de-términos)

---

## 1. Estado Actual del Proyecto

La aplicación es una academia de cursos online **monolítica** con la siguiente estructura:

### Backend (Django 5.1 + DRF)
- **Apps existentes:** `users`, `courses`, `quizzes`, `progress`, `qna`, `blog`, `certificates`
- **Autenticación:** JWT con SimpleJWT (access token 2h, refresh 7 días)
- **Roles:** `admin`, `instructor`, `student`
- **Base de datos:** PostgreSQL 16
- **Servicios externos:** Cloudinary (imágenes), SMTP (email), ReportLab (PDFs de certificados)

### Frontend (React 19 + Vite)
- **Routing:** react-router-dom v7
- **Estado global:** Contextos (AuthContext, ProgressContext, ThemeContext)
- **Comunicación:** Axios con interceptores JWT
- **Estilos:** TailwindCSS + Framer Motion

### Limitaciones actuales
- No existe concepto de **secciones** o áreas independientes dentro de la plataforma
- No hay sistema de **categorías** para organizar cursos
- Los quizzes solo admiten **opción múltiple**
- No hay **material de apoyo** descargable (PDFs, presentaciones)
- Los exámenes finales solo admiten **cuestionarios**, no entregas de archivos/videos
- El registro no captura **ubicación geográfica** ni **fecha de nacimiento**
- No hay **encuesta de intereses** para recomendar cursos
- No hay **gráficas de ingresos** para el administrador
- El instructor no tiene un panel detallado de **seguimiento de alumnos**

---

## 2. Visión General de la Reestructuración

La plataforma pasará de ser una academia única a una **plataforma multi-sección** con tres áreas independientes:

| Sección | Acceso | Descripción |
|---------|--------|-------------|
| **Maily Academia** | Credenciales especiales (administradas por admin) | Cursos exclusivos para usuarios del software Maily. Videos de preview públicos para mostrar el software. A futuro se integrará con el sistema de credenciales del software. |
| **Longevity 360** | Registro público libre | Academia abierta con cursos de paga y gratuitos, orientados al área de salud. Cualquier persona puede registrarse. Sistema de categorías y recomendaciones. |
| **Corporativo CAMSA** | Credenciales corporativas (administradas por admin) | Sección exclusiva para miembros del corporativo. Al iniciar sesión con credenciales corporativas, el usuario es redirigido directamente a esta sección. |

### Reglas de acceso resumidas

- **Login principal único:** Todos los usuarios inician sesión desde la misma pantalla de login.
- **Redirección automática:** Según el tipo de credencial/membresía del usuario, se redirige a la sección correspondiente.
- **Credenciales Maily y Corporativo:** Se crean desde el panel de administrador (no hay auto-registro para estas secciones).
- **Credenciales Longevity 360:** Cualquier persona puede registrarse libremente.
- **Vista previa pública:** La sección Maily Academia tendrá videos de demostración visibles sin autenticación desde la landing page.

---

## 3. Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│                      LANDING PAGE PÚBLICA                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Preview      │  │   Login      │  │   Registro            │ │
│  │  Maily Acad.  │  │   Principal  │  │   (solo Longevity)    │ │
│  └──────────────┘  └──────┬───────┘  └───────────┬───────────┘ │
└────────────────────────────┼──────────────────────┼─────────────┘
                             │                      │
              ┌──────────────┼──────────────┐       │
              ▼              ▼              ▼       ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
   │    MAILY     │ │ CORPORATIVO  │ │   LONGEVITY 360  │
   │   ACADEMIA   │ │    CAMSA     │ │                  │
   │              │ │              │ │  ┌─Encuesta ──┐  │
   │ - Dashboard  │ │ - Dashboard  │ │  │ inicial    │  │
   │ - Cursos     │ │ - Cursos     │ │  └────────────┘  │
   │ - Lecciones  │ │ - Lecciones  │ │                  │
   │ - Quizzes    │ │ - Quizzes    │ │  - Dashboard     │
   │ - Certific.  │ │ - Certific.  │ │  - Categorías    │
   │              │ │              │ │  - Cursos         │
   │ Acceso:      │ │ Acceso:      │ │  - Lecciones     │
   │ cred. admin  │ │ cred. admin  │ │  - Quizzes       │
   └──────────────┘ └──────────────┘ │  - Certificados  │
                                     │  - Recomendac.   │
                                     │                  │
                                     │  Acceso: libre   │
                                     └──────────────────┘
```

### Flujo de autenticación objetivo

```
Usuario llega a la Landing Page
        │
        ├── Clic en "Iniciar Sesión"
        │       │
        │       ▼
        │   Login Principal (email + password)
        │       │
        │       ├── ¿Tiene membresía CORPORATIVO activa?
        │       │       SÍ → Redirigir a /corporativo/dashboard
        │       │
        │       ├── ¿Tiene membresía MAILY activa?
        │       │       SÍ → Redirigir a /maily/dashboard
        │       │
        │       └── Por defecto (membresía PÚBLICA)
        │               → Redirigir a /longevity/dashboard
        │
        ├── Clic en "Registrarse" (solo Longevity 360)
        │       │
        │       ▼
        │   Formulario de registro (datos personales + ubicación + fecha nacimiento)
        │       │
        │       ▼
        │   Encuesta inicial (ocupación + temas de interés)
        │       │
        │       ▼
        │   /longevity/dashboard (con recomendaciones personalizadas)
        │
        └── Clic en "Ver Preview Maily"
                │
                ▼
            Videos de demostración del software (sin autenticación)
```

---

## FASE 1 - Arquitectura Multi-Sección (Fundación)

> **Prioridad:** CRÍTICA  
> **Complejidad:** Alta  
> **Prerequisitos:** Ninguno (es la base de todo lo demás)

### Objetivo

Crear la infraestructura de base de datos, API y frontend para soportar tres secciones independientes con distintos niveles de acceso y redirección automática post-login.

---

### 1.1 Nueva app `apps.sections`

Se crea una nueva app Django `apps.sections` que contendrá toda la lógica de secciones.

**Archivos a crear:**
```
backend/apps/sections/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── permissions.py
└── migrations/
    └── __init__.py
```

---

### 1.2 Modelo `Section`

**Archivo:** `backend/apps/sections/models.py`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | CharField(100) | Nombre visible de la sección. Ej: "Maily Academia", "Longevity 360", "Corporativo CAMSA" |
| `slug` | SlugField(unique) | Identificador URL. Ej: `maily-academia`, `longevity-360`, `corporativo-camsa` |
| `description` | TextField | Descripción de la sección para la landing page |
| `section_type` | CharField(choices) | Tipo de sección: `maily`, `public`, `corporate`. Determina la lógica de acceso |
| `logo` | URLField(nullable) | URL del logo de la sección (Cloudinary u otro) |
| `is_active` | BooleanField(default=True) | Si la sección está activa y visible |
| `require_credentials` | BooleanField | Si requiere credenciales especiales (True para Maily y Corporativo) |
| `allow_public_preview` | BooleanField | Si permite vista previa sin auth (True para Maily) |
| `created_at` | DateTimeField(auto) | Fecha de creación |
| `updated_at` | DateTimeField(auto) | Fecha de última actualización |

**Valores iniciales (seed data):**

| name | slug | section_type | require_credentials | allow_public_preview |
|------|------|-------------|--------------------|--------------------|
| Maily Academia | maily-academia | maily | True | True |
| Longevity 360 | longevity-360 | public | False | False |
| Corporativo CAMSA | corporativo-camsa | corporate | True | False |

---

### 1.3 Modelo `SectionMembership`

**Archivo:** `backend/apps/sections/models.py`

Relación muchos-a-muchos entre usuarios y secciones, con metadatos de membresía.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user` | FK → User | Usuario miembro |
| `section` | FK → Section | Sección a la que pertenece |
| `role` | CharField(choices) | Rol dentro de la sección: `student`, `instructor`, `admin` |
| `granted_by` | FK → User (nullable) | Administrador que otorgó el acceso |
| `is_active` | BooleanField(default=True) | Si la membresía está activa |
| `granted_at` | DateTimeField(auto) | Fecha en que se otorgó |
| `expires_at` | DateTimeField(nullable) | Fecha de expiración (null = sin expiración) |

**Restricción única:** `unique_together = ['user', 'section']` — un usuario solo puede tener una membresía por sección.

**Lógica de negocio:**
- Para **Maily Academia** y **Corporativo CAMSA**: las membresías las crea el administrador desde el panel admin.
- Para **Longevity 360**: se crea automáticamente al registrarse un usuario nuevo.
- Un usuario puede tener membresías en múltiples secciones simultáneamente.
- La propiedad `is_expired` verifica si `expires_at` ya pasó.

---

### 1.4 Modificación del modelo `Course`

**Archivo:** `backend/apps/courses/models.py`

Agregar campo nuevo:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `section` | FK → Section (nullable) | Sección a la que pertenece el curso. Nullable para migración gradual de cursos existentes. |

**Migración de datos:** Los cursos existentes se asignarán a la sección "Longevity 360" por defecto.

---

### 1.5 Modificación de la lógica de login

**Archivo:** `backend/apps/users/views.py` — `SecureLoginView`

Flujo actual:
1. Validar credenciales
2. Verificar bloqueo de cuenta
3. Devolver tokens JWT

Flujo nuevo (después de autenticación exitosa):
1. Validar credenciales (sin cambios)
2. Verificar bloqueo de cuenta (sin cambios)
3. **NUEVO:** Consultar `SectionMembership` activas del usuario
4. **NUEVO:** Determinar `redirect_section` según prioridad:
   - Si tiene membresía `corporate` activa → `redirect_section: "corporativo-camsa"`
   - Si tiene membresía `maily` activa → `redirect_section: "maily-academia"`
   - Por defecto → `redirect_section: "longevity-360"`
5. **NUEVO:** Incluir en la respuesta JWT:
   ```json
   {
     "access": "eyJ...",
     "refresh": "eyJ...",
     "redirect_section": "corporativo-camsa",
     "user": {
       "id": 1,
       "email": "user@example.com",
       "role": "student",
       "sections": ["corporativo-camsa", "longevity-360"]
     }
   }
   ```

**Nota importante:** Si un usuario tiene credenciales corporativas, al iniciar sesión se redirige DIRECTAMENTE a la sección corporativa (no ve el dashboard general).

---

### 1.6 Nuevos endpoints de API

**Archivo:** `backend/apps/sections/urls.py`

#### Endpoints públicos (sin autenticación)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sections/` | Listar todas las secciones activas (nombre, slug, descripción, logo) |
| GET | `/api/sections/{slug}/` | Detalle de una sección |
| GET | `/api/sections/{slug}/preview/` | Cursos de preview (solo para secciones con `allow_public_preview=True`) |

#### Endpoints autenticados

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sections/{slug}/courses/` | Cursos de la sección (requiere membresía activa en la sección) |
| GET | `/api/sections/my-sections/` | Secciones a las que tiene acceso el usuario autenticado |

#### Endpoints de administrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/sections/{slug}/members/` | Listar miembros de una sección |
| POST | `/api/admin/sections/{slug}/members/` | Otorgar acceso a un usuario (body: `{user_id, role}`) |
| PATCH | `/api/admin/sections/{slug}/members/{user_id}/` | Modificar membresía (activar/desactivar, cambiar rol, expiración) |
| DELETE | `/api/admin/sections/{slug}/members/{user_id}/` | Revocar acceso a la sección |

---

### 1.7 Permisos personalizados

**Archivo:** `backend/apps/sections/permissions.py`

| Permiso | Descripción |
|---------|-------------|
| `HasSectionAccess` | Verifica que el usuario tenga membresía activa en la sección del request |
| `IsSectionAdmin` | Verifica que el usuario sea admin de la sección |
| `IsSectionInstructor` | Verifica que el usuario sea instructor de la sección |
| `CanViewSectionPreview` | Permite acceso sin auth si la sección tiene `allow_public_preview=True` |

---

### 1.8 Reestructuración del frontend

#### Nuevas rutas

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | `Landing.jsx` | Público — nueva landing page con las tres secciones |
| `/login` | `Login.jsx` | Público — formulario de login (antes estaba en `/` como Auth.jsx) |
| `/register` | `Register.jsx` | Público — registro solo para Longevity 360 |
| `/maily/dashboard` | `MailyDashboard.jsx` | Membresía Maily |
| `/maily/courses` | `MailyCourses.jsx` | Membresía Maily |
| `/maily/course/:courseId` | `CourseView.jsx` (reutilizable) | Membresía Maily |
| `/longevity/dashboard` | `LongevityDashboard.jsx` | Membresía Longevity (o cualquier registrado) |
| `/longevity/courses` | `LongevityCourses.jsx` | Membresía Longevity |
| `/longevity/course/:courseId` | `CourseView.jsx` (reutilizable) | Membresía Longevity |
| `/corporativo/dashboard` | `CorporativoDashboard.jsx` | Membresía Corporativo |
| `/corporativo/courses` | `CorporativoCourses.jsx` | Membresía Corporativo |
| `/corporativo/course/:courseId` | `CourseView.jsx` (reutilizable) | Membresía Corporativo |
| `/admin/*` | (sin cambios) | Admin |
| `/instructor/*` | (sin cambios) | Instructor |

#### Nuevo contexto: `SectionContext`

**Archivo:** `cursos-maily/src/context/SectionContext.jsx`

Estado que maneja:
- `currentSection` — sección activa del usuario
- `availableSections` — secciones a las que tiene acceso
- `switchSection(slug)` — cambiar de sección (si tiene acceso a múltiples)

#### Modificaciones en AuthContext

**Archivo:** `cursos-maily/src/context/AuthContext.jsx`

- Después del login, leer `redirect_section` de la respuesta y navegar a la ruta correspondiente
- Almacenar `sections` del usuario en el estado
- Modificar `getDashboardPath()` para considerar la sección activa

#### Nueva landing page

**Archivo:** `cursos-maily/src/pages/Landing.jsx`

Secciones de la landing:
1. **Hero** — título principal de la plataforma con branding
2. **Tres tarjetas de sección** — Maily Academia, Longevity 360, Corporativo CAMSA con descripción y CTA
3. **Preview Maily** — carrusel de videos de demostración del software (sin auth)
4. **Call to action** — botones de "Iniciar Sesión" y "Registrarse"

#### Navbar adaptativa

**Archivo:** `cursos-maily/src/components/layout/Navbar.jsx`

- Mostrar logo y nombre de la sección activa
- Menú de navegación adaptado a la sección
- Si el usuario tiene acceso a múltiples secciones, mostrar selector de sección

---

### 1.9 Archivos a crear y modificar (resumen)

#### Backend — Crear:
- `backend/apps/sections/__init__.py`
- `backend/apps/sections/apps.py`
- `backend/apps/sections/models.py` — `Section`, `SectionMembership`
- `backend/apps/sections/serializers.py`
- `backend/apps/sections/views.py`
- `backend/apps/sections/urls.py`
- `backend/apps/sections/permissions.py`
- `backend/apps/sections/admin.py`
- `backend/apps/sections/migrations/__init__.py`

#### Backend — Modificar:
- `backend/config/settings.py` — agregar `apps.sections` a `INSTALLED_APPS`
- `backend/config/urls.py` — agregar rutas de secciones
- `backend/apps/courses/models.py` — agregar FK `section` a `Course`
- `backend/apps/users/views.py` — modificar `SecureLoginView` para incluir redirect por sección
- `backend/apps/users/serializers.py` — incluir secciones en la respuesta del usuario

#### Frontend — Crear:
- `cursos-maily/src/pages/Landing.jsx`
- `cursos-maily/src/context/SectionContext.jsx`
- `cursos-maily/src/pages/maily/MailyDashboard.jsx`
- `cursos-maily/src/pages/maily/MailyCourses.jsx`
- `cursos-maily/src/pages/longevity/LongevityDashboard.jsx`
- `cursos-maily/src/pages/longevity/LongevityCourses.jsx`
- `cursos-maily/src/pages/corporativo/CorporativoDashboard.jsx`
- `cursos-maily/src/pages/corporativo/CorporativoCourses.jsx`
- `cursos-maily/src/components/layout/SectionSelector.jsx`

#### Frontend — Modificar:
- `cursos-maily/src/App.jsx` — reestructurar rutas completas
- `cursos-maily/src/context/AuthContext.jsx` — manejar redirect por sección
- `cursos-maily/src/components/layout/Navbar.jsx` — adaptarse a sección activa
- `cursos-maily/src/services/api.js` — (si se necesita pasar sección en headers)

---

## FASE 2 - Mejoras en Registro y Perfil de Usuario

> **Prioridad:** Alta  
> **Complejidad:** Media  
> **Prerequisitos:** Fase 1

### Objetivo

Enriquecer la información del usuario con datos de ubicación geográfica, fecha de nacimiento (con cálculo automático de edad), tipo de ocupación, y una encuesta de intereses al primer ingreso para recomendar cursos personalizados.

---

### 2.1 Nuevos campos en el modelo `Profile`

**Archivo:** `backend/apps/users/models.py`

Agregar los siguientes campos al modelo `Profile` existente:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `country` | CharField(100, blank) | País del usuario |
| `state` | CharField(100, blank) | Estado o provincia |
| `city` | CharField(100, blank) | Ciudad |
| `date_of_birth` | DateField(nullable) | Fecha de nacimiento |
| `occupation_type` | CharField(choices, blank) | Tipo de ocupación: `student`, `worker`, `other` |
| `has_completed_survey` | BooleanField(default=False) | Si ya completó la encuesta de intereses |

**Propiedad calculada:**
```python
@property
def age(self):
    if not self.date_of_birth:
        return None
    today = date.today()
    born = self.date_of_birth
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
```

---

### 2.2 Nuevo modelo `SurveyResponse`

**Archivo:** `backend/apps/users/models.py`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user` | OneToOneField → User | Un usuario, una encuesta |
| `occupation_type` | CharField(choices) | Estudiante, trabajador u otro |
| `interests` | JSONField | Lista de slugs de categorías seleccionadas. Ej: `["nutricion", "psicologia", "enfermeria"]` |
| `other_interests` | TextField(blank) | Campo libre para temas no listados |
| `completed_at` | DateTimeField(auto) | Cuándo completó la encuesta |

---

### 2.3 Endpoints nuevos y modificados

| Método | Ruta | Descripción |
|--------|------|-------------|
| PATCH | `/api/auth/me/` | **Modificar** — ahora acepta: `country`, `state`, `city`, `date_of_birth` |
| POST | `/api/auth/survey/` | **Nuevo** — guardar respuesta de encuesta (`occupation_type`, `interests`) |
| GET | `/api/auth/survey/` | **Nuevo** — obtener encuesta del usuario (o 404 si no ha completado) |
| GET | `/api/courses/recommended/` | **Nuevo** — cursos recomendados basados en los intereses de la encuesta |

**Lógica de recomendaciones (`/api/courses/recommended/`):**
1. Obtener `SurveyResponse` del usuario
2. Filtrar cursos cuya `category.slug` esté en `interests` del usuario
3. Ordenar por relevancia (match de intereses + rating + novedad)
4. Paginar resultados

---

### 2.4 Modificación del formulario de registro

**Archivo:** `cursos-maily/src/pages/Register.jsx` (antes `Auth.jsx`)

Campos actuales del registro:
- Nombre, Apellido, Teléfono, Email, Contraseña, Confirmar contraseña

**Campos nuevos a agregar:**
- País (select con lista de países)
- Estado/Provincia (input de texto o select dinámico)
- Ciudad (input de texto)
- Fecha de nacimiento (date picker)

**Validaciones frontend:**
- Fecha de nacimiento: no menor de 13 años, no mayor de 120 años
- País: obligatorio
- Estado y Ciudad: opcionales pero recomendados

---

### 2.5 Nueva pantalla de encuesta inicial

**Archivo:** `cursos-maily/src/pages/Survey.jsx`

Se muestra después del primer login (si `has_completed_survey === false`).

**Flujo:**
1. Pantalla 1: "¿Cuál es tu ocupación?" — Selector entre: Estudiante / Trabajador del área de salud / Otro
2. Pantalla 2: "¿Qué temas te interesan?" — Grid de categorías con checkboxes (las categorías vienen de la API, Fase 3)
3. Pantalla 3: "¿Algo más que te gustaría aprender?" — Campo de texto libre (opcional)
4. Botón "Completar" → `POST /api/auth/survey/` → Redirigir al dashboard

**Diseño:** Estilo wizard/stepper con animaciones (Framer Motion), indicador de progreso 1/3, 2/3, 3/3.

---

### 2.6 Modificación del Dashboard

**Archivo:** `cursos-maily/src/pages/longevity/LongevityDashboard.jsx`

Agregar nueva sección: **"Recomendados para ti"**
- Muestra entre 3-6 cursos basados en los intereses del usuario
- Si no ha completado la encuesta, muestra un banner invitando a completarla
- Usa `GET /api/courses/recommended/`

---

### 2.7 Archivos a crear y modificar

#### Backend — Modificar:
- `backend/apps/users/models.py` — agregar campos a `Profile` y nuevo modelo `SurveyResponse`
- `backend/apps/users/serializers.py` — serializers para encuesta y campos nuevos de perfil
- `backend/apps/users/views.py` — vistas de encuesta
- `backend/apps/users/urls.py` — ruta `/api/auth/survey/`
- `backend/apps/courses/views.py` — endpoint de recomendaciones

#### Frontend — Crear:
- `cursos-maily/src/pages/Survey.jsx`

#### Frontend — Modificar:
- `cursos-maily/src/pages/Register.jsx` (o `Auth.jsx`) — campos nuevos
- `cursos-maily/src/pages/longevity/LongevityDashboard.jsx` — sección de recomendaciones
- `cursos-maily/src/services/authService.js` — funciones de encuesta
- `cursos-maily/src/context/AuthContext.jsx` — incluir `has_completed_survey` en user

---

## FASE 3 - Sistema de Categorías

> **Prioridad:** Alta  
> **Complejidad:** Baja-Media  
> **Prerequisitos:** Fase 1 (para vincular categorías a secciones)

### Objetivo

Crear un sistema de categorías orientado al área de salud, gestionado por el administrador, que permita organizar y filtrar cursos. Las categorías servirán también como opciones en la encuesta de intereses (Fase 2).

---

### 3.1 Modelo `Category`

**Archivo:** `backend/apps/courses/models.py` (se agrega al mismo archivo de cursos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | CharField(100) | Nombre de la categoría. Ej: "Nutrición" |
| `slug` | SlugField(unique) | Identificador URL. Ej: `nutricion` |
| `description` | TextField(blank) | Descripción de la categoría |
| `icon` | CharField(50, blank) | Nombre de icono (Lucide) o emoji para mostrar en UI |
| `parent` | FK → self (nullable) | Categoría padre para subcategorías (ej: "Nutrición" → "Nutrición Deportiva") |
| `section` | FK → Section (nullable) | Si la categoría es exclusiva de una sección (null = disponible para todas) |
| `order` | IntegerField(default=0) | Orden de visualización |
| `is_active` | BooleanField(default=True) | Si la categoría está activa |
| `created_at` | DateTimeField(auto) | Fecha de creación |

---

### 3.2 Modificación del modelo `Course`

**Archivo:** `backend/apps/courses/models.py`

Agregar:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `category` | FK → Category (nullable) | Categoría principal del curso |
| `tags` | JSONField(default=list) | Tags adicionales para filtrado libre. Ej: `["anatomía", "primer semestre"]` |

---

### 3.3 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/categories/` | Listar categorías activas (pública). Parámetros: `?section=slug`, `?parent=slug` |
| GET | `/api/categories/{slug}/` | Detalle de categoría con subcategorías |
| POST | `/api/admin/categories/` | Crear categoría (solo admin) |
| PATCH | `/api/admin/categories/{slug}/` | Actualizar categoría |
| DELETE | `/api/admin/categories/{slug}/` | Desactivar categoría |

Modificar endpoint existente:
- `GET /api/courses/` — agregar filtro `?category=slug` y `?tags=tag1,tag2`
- `GET /api/sections/{slug}/courses/` — incluir filtro por categoría

---

### 3.4 Categorías iniciales (seed data)

Orientadas al área de salud:

| Nombre | Slug | Icono sugerido |
|--------|------|---------------|
| Medicina General | medicina-general | Stethoscope |
| Enfermería | enfermeria | Heart |
| Odontología | odontologia | Smile |
| Nutrición | nutricion | Apple |
| Psicología | psicologia | Brain |
| Fisioterapia | fisioterapia | Activity |
| Farmacología | farmacologia | Pill |
| Tecnología Médica | tecnologia-medica | Monitor |
| Salud Pública | salud-publica | Shield |
| Administración Hospitalaria | administracion-hospitalaria | Building |

---

### 3.5 Frontend

#### Componente `CategoryFilter`
**Archivo:** `cursos-maily/src/components/CategoryFilter.jsx`

- Grid o lista horizontal de categorías con iconos
- Filtrado activo: al seleccionar una categoría, filtra los cursos mostrados
- Integrado en las páginas de listado de cursos de cada sección

#### Panel admin de categorías
**Archivo:** `cursos-maily/src/pages/admin/CategoryManagement.jsx`

- Tabla CRUD de categorías
- Soporte para subcategorías (arrastrar para reorganizar)
- Asignar categoría a una sección específica o dejar global

---

## FASE 4 - Material de Apoyo en Cursos

> **Prioridad:** Media  
> **Complejidad:** Media  
> **Prerequisitos:** Fase 1

### Objetivo

Permitir que los instructores suban archivos de apoyo (PDFs, presentaciones PowerPoint, documentos Word, hojas de cálculo, imágenes) asociados a un curso, módulo o lección específica, para que los alumnos inscritos puedan descargarlos.

---

### 4.1 Modelo `CourseMaterial`

**Archivo:** `backend/apps/courses/models.py`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `course` | FK → Course | Curso al que pertenece (siempre presente) |
| `module` | FK → Module (nullable) | Módulo específico (null si es material general del curso) |
| `lesson` | FK → Lesson (nullable) | Lección específica (null si es material del módulo o curso) |
| `title` | CharField(200) | Título descriptivo del material |
| `description` | TextField(blank) | Descripción opcional |
| `file` | FileField(`materials/`) | Archivo subido |
| `file_type` | CharField(20) | Tipo: `pdf`, `pptx`, `ppt`, `docx`, `doc`, `xlsx`, `xls`, `image`, `other` |
| `file_size` | PositiveIntegerField | Tamaño en bytes |
| `original_filename` | CharField(255) | Nombre original del archivo subido |
| `uploaded_by` | FK → User | Instructor que subió el material |
| `download_count` | PositiveIntegerField(default=0) | Contador de descargas |
| `order` | IntegerField(default=0) | Orden de visualización |
| `created_at` | DateTimeField(auto) | Fecha de subida |

**Validaciones:**
- Tipos permitidos: `.pdf`, `.pptx`, `.ppt`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.png`, `.jpg`, `.jpeg`
- Tamaño máximo: 50 MB por archivo
- Máximo 20 archivos por lección, 50 por módulo, 100 por curso

---

### 4.2 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/courses/{id}/materials/` | Listar materiales del curso (alumno inscrito) |
| GET | `/api/courses/{id}/materials/?module={id}` | Filtrar por módulo |
| GET | `/api/courses/{id}/materials/?lesson={id}` | Filtrar por lección |
| POST | `/api/courses/{id}/materials/upload/` | Subir material (instructor del curso o admin). Body: multipart/form-data |
| GET | `/api/materials/{id}/download/` | Descargar archivo (alumno inscrito, incrementa contador) |
| PATCH | `/api/materials/{id}/` | Actualizar título/descripción (instructor/admin) |
| DELETE | `/api/materials/{id}/` | Eliminar material (instructor/admin) |

---

### 4.3 Frontend — Vista del instructor (CourseBuilder)

**Archivo:** `cursos-maily/src/pages/instructor/CourseBuilder.jsx`

Agregar nueva pestaña/sección **"Material de Apoyo"** en el builder del curso:
- Lista de materiales existentes agrupados por módulo/lección
- Botón "Subir material" con:
  - Selector de archivo (drag-and-drop)
  - Campos: título, descripción
  - Selector: ¿a qué módulo/lección asociar?
- Iconos según tipo de archivo (PDF rojo, PPT naranja, DOC azul, etc.)
- Botón de eliminar por material

---

### 4.4 Frontend — Vista del alumno (LessonView)

**Archivo:** `cursos-maily/src/pages/LessonView.jsx`

Agregar sección **"Material de apoyo"** debajo del video:
- Lista de archivos descargables con icono, nombre, tamaño y botón de descarga
- Mostrar solo los materiales asociados a la lección actual
- Opcionalmente, pestaña con materiales del módulo completo

---

### 4.5 Servicio frontend

**Archivo:** `cursos-maily/src/services/materialService.js`

```javascript
// Funciones:
list(courseId, filters)        // GET /api/courses/{id}/materials/
upload(courseId, formData)     // POST /api/courses/{id}/materials/upload/
download(materialId)           // GET /api/materials/{id}/download/ (blob)
update(materialId, data)       // PATCH /api/materials/{id}/
remove(materialId)             // DELETE /api/materials/{id}/
```

---

## FASE 5 - Quizzes Interactivos Avanzados

> **Prioridad:** Media  
> **Complejidad:** Alta  
> **Prerequisitos:** Fase 1

### Objetivo

Ampliar el sistema de quizzes para incluir tipos de preguntas interactivas más allá de opción múltiple: ordenar palabras, sopa de letras, crucigrama, relacionar columnas y llenar espacios en blanco.

---

### 5.1 Modificación del modelo `Question`

**Archivo:** `backend/apps/quizzes/models.py`

Agregar campos al modelo `Question` existente:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `question_type` | CharField(choices, default=`multiple_choice`) | Tipo de pregunta |
| `config` | JSONField(default=dict) | Configuración específica del tipo de pregunta |

**Tipos de pregunta disponibles:**

| Tipo | Valor | Descripción |
|------|-------|-------------|
| Opción múltiple | `multiple_choice` | El tipo actual. Sin cambios en su funcionamiento |
| Ordenar palabras | `word_order` | Arrastra palabras/frases al orden correcto |
| Sopa de letras | `word_search` | Encuentra palabras ocultas en una grilla |
| Crucigrama | `crossword` | Completa un crucigrama con pistas |
| Relacionar columnas | `matching` | Conecta elementos de dos columnas |
| Llenar espacios | `fill_blank` | Completa oraciones con las palabras correctas |

---

### 5.2 Estructura JSON de `config` por tipo

#### `multiple_choice` (actual, sin cambios)
Se sigue usando `options` y `correct_answer` existentes. `config` vacío o no se usa.

#### `word_order`
```json
{
  "instruction": "Ordena las fases de la mitosis de primera a última",
  "items": ["Profase", "Metafase", "Anafase", "Telofase"],
  "correct_order": [0, 1, 2, 3]
}
```
**Calificación:** La respuesta del alumno es un array de índices. Se compara con `correct_order`. Puntuación parcial posible (% de elementos en posición correcta).

#### `word_search`
```json
{
  "grid_size": 12,
  "words_to_find": ["CELULA", "MITOSIS", "ADN", "RIBOSOMA", "CITOPLASMA"],
  "grid": [
    ["C", "E", "L", "U", "L", "A", "X", "M", "P", "Q", "R", "S"],
    ...
  ],
  "word_positions": [
    {"word": "CELULA", "start": [0,0], "end": [0,5], "direction": "horizontal"},
    ...
  ],
  "time_limit_seconds": 180
}
```
**Calificación:** El alumno envía las palabras encontradas con sus coordenadas. Se valida contra `word_positions`. Puntuación = palabras correctas / total.

**Generación de grilla:** Se incluirá un utilitario Python (`apps/quizzes/utils/word_search_generator.py`) que genera la grilla automáticamente dadas las palabras, colocándolas aleatoriamente y rellenando con letras aleatorias.

#### `crossword`
```json
{
  "grid_size": {"rows": 10, "cols": 10},
  "words": [
    {
      "word": "CELULA",
      "clue": "Unidad básica de la vida",
      "start_row": 0, "start_col": 2,
      "direction": "horizontal"
    },
    {
      "word": "ADN",
      "clue": "Molécula que almacena información genética",
      "start_row": 0, "start_col": 4,
      "direction": "vertical"
    }
  ]
}
```
**Calificación:** El alumno envía un objeto `{row_col: "letra"}`. Se comparan las letras en las posiciones de las palabras.

#### `matching`
```json
{
  "instruction": "Relaciona cada órgano con su función principal",
  "pairs": [
    {"id": 1, "left": "Corazón", "right": "Bombea sangre al cuerpo"},
    {"id": 2, "left": "Pulmones", "right": "Intercambio de gases O₂/CO₂"},
    {"id": 3, "left": "Hígado", "right": "Metabolismo y desintoxicación"},
    {"id": 4, "left": "Riñones", "right": "Filtración de la sangre"}
  ]
}
```
**Calificación:** El alumno envía `{left_id: right_id}`. Se verifica cada par. Puntuación = pares correctos / total.

#### `fill_blank`
```json
{
  "text": "La {{1}} es la unidad básica de la vida. El {{2}} contiene la información genética.",
  "blanks": [
    {"id": 1, "correct_answers": ["célula", "celula"], "hint": "Empieza con C"},
    {"id": 2, "correct_answers": ["ADN", "adn", "ácido desoxirribonucleico"], "hint": "Siglas de 3 letras"}
  ]
}
```
**Calificación:** Se compara cada respuesta con la lista de respuestas aceptadas (case-insensitive). Puntuación = blanks correctos / total.

---

### 5.3 Módulo de calificación

**Archivo:** `backend/apps/quizzes/graders.py`

```python
# Interfaz:
def grade_question(question, student_answer) -> dict:
    """
    Retorna: {
        "is_correct": bool,
        "score": float,       # 0.0 a 1.0
        "details": dict       # info específica del tipo
    }
    """
    grader = GRADERS[question.question_type]
    return grader(question, student_answer)
```

Se implementa un grader por tipo que recibe la `Question` y la respuesta del alumno, y retorna puntuación parcial o total.

---

### 5.4 Frontend — Componentes interactivos de quiz

**Directorio:** `cursos-maily/src/components/quiz/`

| Componente | Descripción |
|-----------|-------------|
| `QuizRenderer.jsx` | Componente principal que renderiza el tipo correcto según `question_type` |
| `MultipleChoice.jsx` | Refactor del quiz actual de opción múltiple |
| `WordOrder.jsx` | Drag-and-drop con `@dnd-kit/core` para ordenar elementos |
| `WordSearch.jsx` | Grid interactivo donde el usuario selecciona letras para formar palabras |
| `Crossword.jsx` | Grid de crucigrama con inputs por celda y panel de pistas |
| `Matching.jsx` | Dos columnas con drag-and-drop o líneas de conexión |
| `FillBlank.jsx` | Texto con inputs inline en los espacios en blanco |

**Dependencia nueva:** `@dnd-kit/core` y `@dnd-kit/sortable` para drag-and-drop.

---

### 5.5 Creación de quizzes por el instructor

**Archivo:** `cursos-maily/src/pages/instructor/CourseBuilder.jsx`

En la sección de quiz del CourseBuilder:
- Selector de tipo de pregunta al crear una nueva
- Formulario dinámico según el tipo seleccionado:
  - `multiple_choice`: igual que ahora
  - `word_order`: input para las frases/palabras y su orden correcto
  - `word_search`: input de palabras (la grilla se genera automáticamente en backend)
  - `crossword`: input de palabras + pistas + posicionamiento en la grilla
  - `matching`: editor de pares (columna izquierda / columna derecha)
  - `fill_blank`: editor de texto con marcadores `{{n}}` y respuestas por blank
- Preview del quiz antes de guardar

---

## FASE 6 - Exámenes Finales Avanzados

> **Prioridad:** Media  
> **Complejidad:** Alta  
> **Prerequisitos:** Fase 5 (comparten lógica de quizzes)

### Objetivo

Permitir que el instructor elija el tipo de examen final: cuestionario (actual), entrega de archivos, entrega de video, entrega de fotos, proyecto mixto, o combinación. Los alumnos podrán subir sus entregas y el instructor las calificará con retroalimentación.

---

### 6.1 Modificación del modelo `FinalEvaluation`

**Archivo:** `backend/apps/quizzes/models.py`

Agregar campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `evaluation_type` | CharField(choices) | Tipo de examen final |
| `instructions` | TextField(blank) | Instrucciones detalladas del profesor para la entrega |
| `allowed_file_types` | JSONField(default=list) | Extensiones permitidas. Ej: `["pdf", "mp4", "jpg", "png"]` |
| `max_file_size_mb` | IntegerField(default=100) | Tamaño máximo por archivo en MB |
| `max_files` | IntegerField(default=5) | Máximo de archivos por entrega |
| `rubric` | JSONField(nullable) | Rúbrica de evaluación (criterios y pesos) |

**Tipos de evaluación (`evaluation_type`):**

| Valor | Descripción | Qué entrega el alumno |
|-------|-------------|----------------------|
| `quiz` | Cuestionario (actual) | Respuestas a preguntas |
| `file_upload` | Entrega de documentos | PDFs, Word, Excel, presentaciones |
| `video_upload` | Entrega de video | Archivos .mp4, .mov, .avi |
| `photo_upload` | Entrega de fotos/imágenes | Archivos .jpg, .png, .webp |
| `project` | Proyecto completo | Cualquier combinación de archivos |
| `mixed` | Mixto (quiz + archivos) | Cuestionario + archivos adjuntos |

---

### 6.2 Nuevo modelo `EvaluationSubmission`

**Archivo:** `backend/apps/quizzes/models.py`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `student` | FK → User | Alumno que entrega |
| `evaluation` | FK → FinalEvaluation | Evaluación a la que responde |
| `request` | FK → FinalEvaluationRequest | Solicitud de evaluación aprobada |
| `comments` | TextField(blank) | Comentarios del alumno sobre su entrega |
| `status` | CharField(choices) | Estado: `draft`, `submitted`, `under_review`, `graded`, `returned` |
| `grade` | DecimalField(nullable) | Calificación del instructor (0-100) |
| `passed` | BooleanField(nullable) | Si aprobó o no |
| `feedback` | TextField(blank) | Retroalimentación del instructor |
| `submitted_at` | DateTimeField(nullable) | Fecha de envío |
| `graded_at` | DateTimeField(nullable) | Fecha de calificación |
| `graded_by` | FK → User (nullable) | Instructor que calificó |

---

### 6.3 Nuevo modelo `SubmissionFile`

**Archivo:** `backend/apps/quizzes/models.py`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `submission` | FK → EvaluationSubmission | Entrega a la que pertenece |
| `file` | FileField(`submissions/`) | Archivo subido |
| `file_name` | CharField(255) | Nombre original del archivo |
| `file_type` | CharField(20) | Extensión/tipo del archivo |
| `file_size` | PositiveIntegerField | Tamaño en bytes |
| `uploaded_at` | DateTimeField(auto) | Fecha de subida |

**Validaciones:**
- Verificar que el tipo de archivo esté en `allowed_file_types` de la evaluación
- Verificar que no se exceda `max_file_size_mb`
- Verificar que el total de archivos no exceda `max_files`

---

### 6.4 Estructura de la rúbrica (JSONField `rubric`)

```json
{
  "criteria": [
    {
      "name": "Contenido",
      "description": "Calidad y profundidad del contenido",
      "weight": 40,
      "max_score": 100
    },
    {
      "name": "Presentación",
      "description": "Organización y claridad visual",
      "weight": 30,
      "max_score": 100
    },
    {
      "name": "Originalidad",
      "description": "Creatividad y aporte personal",
      "weight": 30,
      "max_score": 100
    }
  ]
}
```

---

### 6.5 Endpoints

#### Para el alumno

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/final-evaluations/{id}/submit/` | Crear entrega con archivos (multipart/form-data) |
| GET | `/api/final-evaluations/{id}/submission/` | Ver mi entrega (estado, archivos, calificación) |
| PATCH | `/api/final-evaluations/{id}/submission/` | Actualizar entrega (solo si status=`draft`) |

#### Para el instructor

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/instructor/evaluations/{id}/submissions/` | Listar entregas de alumnos |
| GET | `/api/instructor/submissions/{id}/` | Detalle de una entrega con archivos |
| PATCH | `/api/instructor/submissions/{id}/grade/` | Calificar: `{grade, passed, feedback}` |
| POST | `/api/instructor/submissions/{id}/return/` | Devolver entrega para corrección |

---

### 6.6 Frontend — Vista del alumno

**Archivo:** `cursos-maily/src/pages/FinalEvaluationView.jsx`

Según `evaluation_type`:
- **`quiz`:** Igual que ahora (cuestionario)
- **`file_upload` / `video_upload` / `photo_upload` / `project`:**
  - Mostrar instrucciones del profesor
  - Zona de drag-and-drop para subir archivos
  - Preview de archivos subidos (thumbnail para imágenes, reproductor para videos, icono para PDFs)
  - Barra de progreso de subida
  - Botón "Enviar entrega"
  - Estado de la entrega (borrador, enviada, en revisión, calificada, devuelta)
  - Si está calificada: mostrar calificación y retroalimentación
- **`mixed`:** Combinación de cuestionario + zona de archivos

---

### 6.7 Frontend — Vista del instructor

**Archivo:** `cursos-maily/src/pages/instructor/InstructorEvaluationsPanel.jsx`

Agregar nueva pestaña **"Entregas"**:
- Lista de entregas filtrable por estado (pendientes, en revisión, calificadas)
- Al hacer clic en una entrega:
  - Ver datos del alumno
  - Ver archivos adjuntos con preview/descarga
  - Reproductor de video inline (si es video)
  - Visor de imágenes (si son fotos)
  - Formulario de calificación con:
    - Puntuación (numérica o por rúbrica si existe)
    - Campo de retroalimentación (texto enriquecido o plain text)
    - Botón "Calificar" o "Devolver para corrección"

---

## FASE 7 - Panel Avanzado del Instructor

> **Prioridad:** Media  
> **Complejidad:** Media-Alta  
> **Prerequisitos:** Fases 4 y 6 (necesita materiales y submissions)

### Objetivo

Crear un dashboard completo para que los instructores monitoreen a sus alumnos: ver qué cursos han tomado, cómo está su progreso, qué tan activos están en la plataforma, ver sus certificados, revisar proyectos entregados y acceder a analytics detallados por curso.

---

### 7.1 Nuevo modelo `UserActivity`

**Archivo:** `backend/apps/progress/models.py`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user` | FK → User | Usuario que realizó la acción |
| `action` | CharField(50) | Tipo de acción |
| `resource_type` | CharField(50) | Tipo de recurso: `course`, `lesson`, `quiz`, `material`, `question` |
| `resource_id` | PositiveIntegerField | ID del recurso |
| `metadata` | JSONField(default=dict) | Datos adicionales según la acción |
| `created_at` | DateTimeField(auto) | Timestamp de la acción |

**Acciones registradas:**

| Acción | Cuándo se registra | Metadata ejemplo |
|--------|-------------------|-----------------|
| `lesson_started` | Al abrir una lección | `{"course_id": 1, "lesson_title": "..."}` |
| `lesson_completed` | Al completar una lección | `{"course_id": 1, "time_spent": 300}` |
| `quiz_attempted` | Al enviar un quiz | `{"quiz_id": 1, "score": 85, "passed": true}` |
| `material_downloaded` | Al descargar material | `{"material_id": 1, "file_type": "pdf"}` |
| `question_asked` | Al crear una pregunta Q&A | `{"lesson_id": 1}` |
| `evaluation_submitted` | Al entregar evaluación final | `{"evaluation_id": 1}` |
| `certificate_claimed` | Al reclamar un certificado | `{"course_id": 1}` |
| `course_enrolled` | Al inscribirse en un curso | `{"course_title": "..."}` |

**Integración:** Se agregan llamadas a `UserActivity.objects.create(...)` en las vistas existentes que correspondan a cada acción.

---

### 7.2 Endpoints para el instructor

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/instructor/students/` | Lista paginada de todos los alumnos inscritos en cursos del instructor |
| GET | `/api/instructor/students/{id}/` | Perfil detallado de un alumno |
| GET | `/api/instructor/students/{id}/activity/` | Historial de actividad reciente del alumno |
| GET | `/api/instructor/students/{id}/progress/` | Progreso en todos los cursos del instructor |
| GET | `/api/instructor/students/{id}/certificates/` | Certificados obtenidos en cursos del instructor |
| GET | `/api/instructor/students/{id}/submissions/` | Proyectos/entregas del alumno |
| GET | `/api/instructor/courses/{id}/analytics/` | Analytics detallados de un curso |

**Detalle de `/api/instructor/students/{id}/`:**
```json
{
  "student": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "avatar": "...",
    "country": "México",
    "occupation_type": "student",
    "date_joined": "2026-01-15"
  },
  "summary": {
    "courses_enrolled": 3,
    "courses_completed": 1,
    "lessons_completed": 25,
    "quizzes_passed": 5,
    "certificates_earned": 1,
    "last_activity": "2026-03-04T10:30:00Z",
    "avg_quiz_score": 82.5
  },
  "courses": [
    {
      "course_id": 1,
      "course_title": "Nutrición Básica",
      "enrolled_at": "2026-01-20",
      "progress_percent": 75,
      "lessons_completed": 12,
      "lessons_total": 16,
      "quizzes_passed": 3,
      "quizzes_total": 4,
      "last_lesson_at": "2026-03-03"
    }
  ]
}
```

**Detalle de `/api/instructor/courses/{id}/analytics/`:**
```json
{
  "course": { "id": 1, "title": "Nutrición Básica" },
  "students_enrolled": 45,
  "students_active_last_7d": 28,
  "students_completed": 12,
  "completion_rate": 26.7,
  "avg_quiz_score": 78.3,
  "avg_time_to_complete_days": 30,
  "module_completion": [
    {"module_id": 1, "title": "Introducción", "completion_rate": 95},
    {"module_id": 2, "title": "Macronutrientes", "completion_rate": 70},
    {"module_id": 3, "title": "Micronutrientes", "completion_rate": 45}
  ],
  "dropout_points": [
    {"lesson_id": 8, "title": "Cálculo de calorías", "dropout_count": 7}
  ]
}
```

---

### 7.3 Frontend — Panel del instructor mejorado

#### Página "Mis Alumnos"
**Archivo:** `cursos-maily/src/pages/instructor/StudentManagement.jsx`

- Tabla paginada y buscable de alumnos
- Columnas: nombre, email, cursos inscritos, progreso promedio, última actividad, estado (activo/inactivo)
- Filtros: por curso, por estado de actividad, por rango de fechas
- Clic en un alumno → vista de detalle

#### Perfil de alumno (detalle)
**Archivo:** `cursos-maily/src/pages/instructor/StudentDetail.jsx`

Tabs:
1. **Resumen** — tarjetas de stats + timeline de actividad reciente
2. **Progreso** — tabla de cursos con barras de progreso, módulos y lecciones
3. **Quizzes** — tabla de intentos con puntuaciones y resultados
4. **Certificados** — lista de certificados obtenidos con opción de ver PDF
5. **Proyectos** — entregas de evaluaciones finales con archivos, estado y calificación

#### Analytics por curso
**Archivo:** `cursos-maily/src/pages/instructor/CourseAnalytics.jsx`

- Gráfica de línea: inscripciones en el tiempo
- Gráfica de barras: tasa de completitud por módulo
- Gráfica de embudo: dónde abandonan los alumnos
- Tabla de alumnos del curso con estado y progreso

**Librería:** `recharts` para las gráficas.

---

## FASE 8 - Analytics de Administrador

> **Prioridad:** Media  
> **Complejidad:** Media  
> **Prerequisitos:** Fase 1

### Objetivo

Dashboard administrativo con gráficas interactivas de ingresos (diarios, semanales, mensuales y anuales), métricas de usuarios y métricas de cursos, con filtros por sección y período.

---

### 8.1 Endpoints de analytics

#### Revenue (Ingresos)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/analytics/revenue/` | Datos de ingresos con filtros |

**Parámetros de query:**

| Parámetro | Valores | Descripción |
|-----------|---------|-------------|
| `period` | `daily`, `weekly`, `monthly`, `yearly` | Granularidad del reporte |
| `section` | slug de sección | Filtrar por sección (opcional) |
| `date_from` | YYYY-MM-DD | Fecha inicio (opcional) |
| `date_to` | YYYY-MM-DD | Fecha fin (opcional) |

**Respuesta ejemplo (`period=monthly`):**
```json
{
  "period": "monthly",
  "currency": "MXN",
  "total_revenue": 125000.00,
  "total_purchases": 250,
  "data": [
    {"label": "Ene 2026", "revenue": 8500.00, "purchases": 17},
    {"label": "Feb 2026", "revenue": 12300.00, "purchases": 25},
    {"label": "Mar 2026", "revenue": 9800.00, "purchases": 20}
  ],
  "comparison": {
    "vs_previous_period": "+15.2%",
    "trend": "up"
  }
}
```

**Implementación backend:**
- Query sobre el modelo `Purchase` (status=`completed`)
- Agrupa por `paid_at` según el período seleccionado
- Usa `django.db.models.functions` (`TruncDay`, `TruncWeek`, `TruncMonth`, `TruncYear`)

---

#### Users (Usuarios)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/analytics/users/` | Métricas de usuarios |

**Respuesta:**
```json
{
  "total_users": 1500,
  "new_users_this_month": 120,
  "active_users_last_7d": 340,
  "users_by_role": {"student": 1400, "instructor": 50, "admin": 5},
  "users_by_section": {"longevity-360": 1200, "maily-academia": 200, "corporativo-camsa": 100},
  "users_by_country": [
    {"country": "México", "count": 800},
    {"country": "Colombia", "count": 200}
  ],
  "registrations_trend": [
    {"label": "Ene", "count": 80},
    {"label": "Feb", "count": 95},
    {"label": "Mar", "count": 120}
  ]
}
```

---

#### Courses (Cursos)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/analytics/courses/` | Métricas de cursos |

**Respuesta:**
```json
{
  "total_courses": 45,
  "published_courses": 38,
  "total_enrollments": 3200,
  "avg_completion_rate": 42.5,
  "top_courses_by_revenue": [
    {"id": 1, "title": "Nutrición Clínica", "revenue": 25000, "enrollments": 150},
    {"id": 5, "title": "Anatomía Avanzada", "revenue": 18000, "enrollments": 90}
  ],
  "top_courses_by_enrollments": [...],
  "courses_by_category": [
    {"category": "Nutrición", "count": 8},
    {"category": "Enfermería", "count": 6}
  ]
}
```

---

### 8.2 Frontend — Dashboard admin mejorado

**Archivo:** `cursos-maily/src/pages/admin/AdminDashboard.jsx`

**Layout del dashboard:**

```
┌──────────────────────────────────────────────────────────────┐
│  TARJETAS KPI (4 tarjetas en fila)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Ingresos │ │ Usuarios │ │  Cursos  │ │ Tasa de  │       │
│  │ del mes  │ │  nuevos  │ │ vendidos │ │conversión│       │
│  │ $12,300  │ │   120    │ │    25    │ │  8.3%    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├──────────────────────────────────────────────────────────────┤
│  GRÁFICA DE INGRESOS (línea/barra)                          │
│  [Diario ▼] [Semanal] [Mensual] [Anual]                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │         📈 Gráfica interactiva                   │       │
│  │         con hover para ver datos                  │       │
│  └──────────────────────────────────────────────────┘       │
├──────────────────────────────────────────────────────────────┤
│  FILA INFERIOR (2 columnas)                                  │
│  ┌─────────────────────────┐ ┌─────────────────────────┐    │
│  │ Usuarios por sección    │ │ Top 5 cursos por        │    │
│  │ (gráfica de dona)       │ │ ingresos (tabla)        │    │
│  └─────────────────────────┘ └─────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Componentes:**
- Tarjetas KPI con icono, valor, comparación vs período anterior (flecha arriba/abajo + porcentaje)
- Gráfica de ingresos con selector de período (tabs o botones)
- Gráfica de dona para distribución de usuarios por sección
- Tabla ordenable de cursos top por ingresos con thumbnail, nombre, ingresos, inscripciones

**Librería:** `recharts` — añadir a `package.json`.

---

## Resumen de Fases y Estimación

| # | Fase | Prioridad | Complejidad | Descripción corta |
|---|------|-----------|-------------|-------------------|
| 1 | Arquitectura Multi-Sección | **Crítica** | Alta | Modelos Section/Membership, login por sección, rutas frontend, landing page |
| 2 | Registro y Perfil Mejorado | Alta | Media | Ubicación, fecha de nacimiento, encuesta de intereses, recomendaciones |
| 3 | Sistema de Categorías | Alta | Baja-Media | Modelo Category, CRUD admin, filtrado de cursos, seed de categorías de salud |
| 4 | Material de Apoyo | Media | Media | Modelo CourseMaterial, subida/descarga de archivos, UI en CourseBuilder y LessonView |
| 5 | Quizzes Interactivos | Media | Alta | 6 tipos de pregunta, graders, componentes frontend interactivos (drag-and-drop, grillas) |
| 6 | Exámenes Finales Avanzados | Media | Alta | Tipos de examen, submissions de archivos/video/foto, calificación por instructor |
| 7 | Panel Instructor Avanzado | Media | Media-Alta | Tracking de alumnos, actividad, proyectos, certificados, analytics por curso |
| 8 | Analytics de Administrador | Media | Media | Gráficas de ingresos (diario/semanal/mensual/anual), métricas de usuarios y cursos |

---

## Dependencias entre Fases

```
FASE 1 (Multi-Sección) ──────┬──────────────────────────────────────
         │                    │                                      │
         ▼                    ▼                                      ▼
    FASE 2 (Registro)    FASE 4 (Material)                    FASE 8 (Analytics)
         │               FASE 5 (Quizzes)
         ▼                    │
    FASE 3 (Categorías)       ▼
                         FASE 6 (Exámenes)
                              │
                              ▼
                         FASE 7 (Panel Instructor)
```

**Reglas:**
- **Fase 1 es prerequisito de TODAS las demás** — establece la base multi-sección
- **Fases 2 y 3** pueden hacerse en paralelo después de Fase 1
- **Fases 4 y 5** pueden hacerse en paralelo después de Fase 1
- **Fase 6** depende de Fase 5 (comparten lógica de quizzes y graders)
- **Fase 7** depende de Fases 4 y 6 (necesita materiales y submissions para mostrar)
- **Fase 8** puede empezarse tan pronto Fase 1 esté completa

---

## Glosario de Términos

| Término | Definición |
|---------|-----------|
| **Sección** | Área independiente de la plataforma con su propio conjunto de cursos y reglas de acceso |
| **Membresía** | Relación que otorga a un usuario acceso a una sección específica |
| **Maily Academia** | Sección exclusiva para usuarios del software Maily (credenciales especiales) |
| **Longevity 360** | Sección pública de la academia, abierta a cualquier usuario registrado |
| **Corporativo CAMSA** | Sección exclusiva para miembros del corporativo CAMSA |
| **Preview** | Videos de demostración visibles sin autenticación (solo en Maily Academia) |
| **Encuesta de intereses** | Cuestionario que se presenta al usuario en su primer ingreso para personalizar recomendaciones |
| **Material de apoyo** | Archivos descargables (PDF, PPT, DOC, etc.) asociados a un curso, módulo o lección |
| **Grader** | Módulo de calificación automática para cada tipo de pregunta de quiz |
| **Submission** | Entrega de un alumno para una evaluación final (archivos, videos, fotos) |
| **Rúbrica** | Criterios de evaluación con pesos definidos por el instructor para calificar entregas |
| **UserActivity** | Registro de acciones del usuario para tracking de actividad y analytics |
| **KPI** | Key Performance Indicator — métrica clave mostrada en dashboards (ingresos, usuarios, etc.) |
