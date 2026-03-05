# Maily Academia — Documentación de Arquitectura y Reglas de Negocio

> Documento generado el 5 de marzo de 2026. Refleja el estado actual del proyecto.

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Backend — Estructura](#2-backend--estructura)
3. [Modelos de Datos](#3-modelos-de-datos)
4. [Permisos y Roles del Sistema](#4-permisos-y-roles-del-sistema)
5. [Endpoints de la API](#5-endpoints-de-la-api)
6. [Frontend — Estructura](#6-frontend--estructura)
7. [Servicios del Frontend](#7-servicios-del-frontend)
8. [Reglas de Negocio](#8-reglas-de-negocio)
9. [Componentes de Quiz](#9-componentes-de-quiz)
10. [Comandos Útiles](#10-comandos-útiles)

---

## 1. Visión General

### Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend framework | Django + Django REST Framework | Django 4.x, DRF 3.x |
| Autenticación | djangorestframework-simplejwt | — |
| Base de datos | PostgreSQL | — |
| Documentación API | drf-spectacular (Swagger / ReDoc) | — |
| Filtros | django-filters | — |
| CORS | django-cors-headers | — |
| Generación PDF | ReportLab | — |
| Almacenamiento imágenes | Cloudinary | — |
| Frontend framework | React | 19.2 |
| Build tool | Vite | 5.4 |
| Router | react-router-dom | 7.x |
| HTTP client | Axios | 1.x |
| Estilos | Tailwind CSS | 3.4 |
| Iconos | lucide-react | — |
| Animaciones | framer-motion | 12.x |
| Gráficas | Recharts | 3.x |
| PDF (cliente) | @react-pdf/renderer, jspdf, html2canvas | — |
| Recorte de imágenes | react-easy-crop | — |

### Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (React)                           │
│  Vite · React 19 · Tailwind · react-router-dom · Axios          │
│                                                                   │
│  ThemeProvider → Router → AuthProvider → SectionContextProvider  │
│                         → ProgressProvider → AppRoutes           │
└─────────────────────────────┬───────────────────────────────────┘
                               │  HTTP + JWT Bearer
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Django + DRF)                        │
│                                                                   │
│  /api/auth/        /api/courses/       /api/sections/             │
│  /api/users/       /api/materials/     /api/instructor/           │
│  /api/quizzes/     /api/progress/      /api/certificates/         │
│  /api/categories/  /api/qna/           /api/blog/                 │
│                                                                   │
│  JWT (simplejwt)  ·  PostgreSQL  ·  Cloudinary  ·  ReportLab      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend — Estructura

### Árbol de Directorios

```
backend/
├── config/
│   ├── settings.py          ← Configuración central
│   ├── urls.py              ← Rutas raíz de toda la API
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── users/               ← Autenticación, roles, perfiles, encuestas
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py          ← /api/auth/
│   │   ├── urls_admin.py    ← /api/users/
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── throttles.py
│   │   ├── validators.py    ← ComplexityPasswordValidator
│   │   └── migrations/      (0001 → 0005)
│   ├── sections/            ← Portales de contenido (Maily/Longevity/Corporativo)
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py          ← /api/sections/ + /api/admin/sections/
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   └── migrations/      (0001 → 0002)
│   ├── courses/             ← Cursos, módulos, lecciones, categorías, materiales
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py          ← /api/courses/
│   │   ├── urls_categories.py ← /api/categories/ + /api/admin/categories/
│   │   ├── urls_materials.py  ← /api/materials/
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── management/commands/
│   │   │   ├── seed_data.py
│   │   │   └── seed_demo_academy.py
│   │   └── migrations/      (0001 → 0009)
│   ├── quizzes/             ← Quizzes por módulo y evaluaciones finales
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── graders.py       ← Lógica de calificación automática
│   │   ├── urls.py
│   │   └── migrations/      (0001 → 0004)
│   ├── progress/            ← Progreso, compras, inscripciones, analytics
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py          ← /api/progress/ + /api/admin/analytics/
│   │   ├── urls_instructor.py ← /api/instructor/
│   │   ├── views_instructor.py
│   │   ├── views_admin_analytics.py
│   │   ├── activity_logger.py ← Helper para registrar UserActivity
│   │   └── migrations/      (0001 → 0005)
│   ├── qna/                 ← Preguntas y respuestas por lección
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── migrations/
│   ├── certificates/        ← Emisión y descarga de certificados
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── migrations/
│   └── blog/                ← Blog (en desarrollo)
│       ├── models.py
│       ├── views.py
│       └── urls.py
└── media/
└── staticfiles/
    └── certificates/maily_template.png  ← Plantilla base de certificados
```

### Configuración Principal (`config/settings.py`)

| Parámetro | Valor |
|---|---|
| Base de datos | PostgreSQL (env: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`) |
| Idioma | `es` |
| Zona horaria | `America/Mexico_City` |
| CORS permitido | `http://localhost:5173` (dev) |
| JWT — Access token | 2 horas |
| JWT — Refresh token | 7 días (con rotación) |
| JWT — Header | `Authorization: Bearer <token>` |
| Paginación | `PageNumberPagination`, `PAGE_SIZE = 20` |
| Throttling anon | 100/hora |
| Throttling user | 1000/hora |
| Throttling auth | 5/minuto |
| Contraseña mínima | 10 caracteres + mayúscula + número + carácter especial |
| Almacenamiento imágenes | Cloudinary (env: `CLOUDINARY_URL`) |
| Email | Configurable (consola en desarrollo) |
| URL Frontend | Env `FRONTEND_URL` (para links de reset de contraseña) |

### Apps Django Instaladas

```
django.contrib.admin
django.contrib.auth
django.contrib.contenttypes
django.contrib.sessions
django.contrib.messages
django.contrib.staticfiles
rest_framework
rest_framework_simplejwt
corsheaders
django_filters
drf_spectacular
apps.users
apps.sections
apps.courses
apps.quizzes
apps.progress
apps.qna
apps.blog
apps.certificates
```

---

## 3. Modelos de Datos

### Diagrama de Relaciones (simplificado)

```
User (1) ──────── (1) Profile
User (1) ──────── (1) SurveyResponse
User (1) ──────── (N) PasswordResetToken
User (N) ──────── (N) Section  [vía SectionMembership]
User (1) ──────── (N) Course   [instructor]
User (1) ──────── (N) Enrollment
User (1) ──────── (N) Purchase
User (1) ──────── (N) LessonProgress
User (1) ──────── (N) QuizAttempt
User (1) ──────── (N) Certificate
User (1) ──────── (N) UserActivity

Section (1) ──── (N) Course
Section (1) ──── (N) Category
Section (1) ──── (N) PromoVideo

Course (1) ──── (N) Module
Course (1) ──── (1) FinalEvaluation
Course (1) ──── (N) CourseMaterial
Module (1) ──── (N) Lesson
Module (1) ──── (1) Quiz
Module (1) ──── (N) CourseMaterial
Lesson (1) ──── (N) LessonProgress
Lesson (1) ──── (N) CourseMaterial
Lesson (1) ──── (N) QnAQuestion

Quiz (1) ──── (N) Question
Quiz (1) ──── (N) QuizAttempt

FinalEvaluation (1) ──── (N) FinalEvaluationQuestion
FinalEvaluation (1) ──── (N) FinalEvaluationRequest
FinalEvaluation (1) ──── (N) FinalEvaluationAttempt

QnAQuestion (1) ──── (N) QnAAnswer
```

---

### App: `users`

#### `User` (extiende `AbstractUser`)

| Campo | Tipo | Notas |
|---|---|---|
| `email` | EmailField | `unique=True`, es el `USERNAME_FIELD` |
| `role` | CharField | `admin \| instructor \| student` (default: `student`) |
| `phone` | CharField(20) | `unique=True`, nullable |
| `is_super_admin` | BooleanField | default `False` |
| `failed_login_attempts` | PositiveIntegerField | Anti-fuerza-bruta |
| `locked_until` | DateTimeField | nullable |

Constantes del modelo:
- `MAX_LOGIN_ATTEMPTS = 5`
- `LOCKOUT_DURATION = 30 minutos`

Métodos: `is_locked`, `increment_failed_attempts()`, `reset_login_attempts()`

#### `Profile` (OneToOne con User)

| Campo | Tipo | Notas |
|---|---|---|
| `user` | OneToOneField | FK a User |
| `bio` | TextField | nullable |
| `phone` | CharField | nullable |
| `avatar` | ImageField | directorio `avatars/` |
| `country`, `state`, `city` | CharField | nullable |
| `date_of_birth` | DateField | nullable |
| `occupation_type` | CharField | `student \| worker \| other` |
| `has_completed_survey` | BooleanField | default `False` |

Property calculada: `age` (desde `date_of_birth`)

#### `SurveyResponse` (OneToOne con User)

| Campo | Tipo | Notas |
|---|---|---|
| `user` | OneToOneField | FK a User |
| `occupation_type` | CharField | — |
| `interests` | JSONField | Lista de slugs de intereses |
| `other_interests` | TextField | nullable |
| `completed_at` | DateTimeField | auto_now_add |

#### `PasswordResetToken`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `token` | UUIDField | `unique=True`, default `uuid4` |
| `created_at` | DateTimeField | auto_now_add |
| `expires_at` | DateTimeField | 1 hora desde creación |
| `used` | BooleanField | default `False` |

Property: `is_valid` (no usado y no expirado)

---

### App: `sections`

#### `Section`

| Campo | Tipo | Notas |
|---|---|---|
| `name` | CharField | — |
| `slug` | SlugField | `unique=True` |
| `description` | TextField | — |
| `section_type` | CharField | `maily \| public \| corporate` |
| `logo` | URLField | nullable |
| `is_active` | BooleanField | default `True` |
| `require_credentials` | BooleanField | — |
| `allow_public_preview` | BooleanField | Permite preview sin membresía |
| `created_at`, `updated_at` | DateTimeField | — |

Secciones actuales del sistema:
- `longevity-360` — tipo `public`
- `maily-academia` — tipo `maily`
- `corporativo-camsa` — tipo `corporate`

#### `SectionMembership` (relación M:N User ↔ Section)

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `section` | ForeignKey | FK a Section |
| `role` | CharField | `student \| instructor \| admin` (dentro de la sección) |
| `granted_by` | ForeignKey | FK a User, nullable |
| `is_active` | BooleanField | default `True` |
| `granted_at` | DateTimeField | auto_now_add |
| `expires_at` | DateTimeField | nullable (sin expiración si `null`) |

Restricción: `unique_together(user, section)`
Properties: `is_expired`, `is_active_and_valid`

#### `PromoVideo`

| Campo | Tipo | Notas |
|---|---|---|
| `section` | ForeignKey | FK a Section |
| `title`, `description` | CharField/TextField | — |
| `embed_url` | URLField | URL de embed del video |
| `duration` | PositiveIntegerField | Segundos |
| `order` | PositiveIntegerField | — |
| `is_active` | BooleanField | default `True` |

---

### App: `courses`

#### `Category`

| Campo | Tipo | Notas |
|---|---|---|
| `name` | CharField | — |
| `slug` | SlugField | `unique=True` |
| `description` | TextField | nullable |
| `icon` | CharField | nullable |
| `order` | PositiveIntegerField | — |
| `parent` | ForeignKey | FK a sí misma (categoría padre), nullable |
| `section` | ForeignKey | FK a Section, nullable (global si `null`) |
| `is_active` | BooleanField | default `True` |
| `created_at` | DateTimeField | — |

#### `Course`

| Campo | Tipo | Notas |
|---|---|---|
| `instructor` | ForeignKey | FK a User (`courses_created`) |
| `category` | ForeignKey | FK a Category, nullable |
| `section` | ForeignKey | FK a Section, nullable |
| `tags` | JSONField | Lista de strings |
| `title` | CharField | — |
| `description` | TextField | — |
| `thumbnail` | URLField | URL de imagen (Cloudinary) |
| `duration` | PositiveIntegerField | Minutos |
| `level` | CharField | `beginner \| intermediate \| advanced` |
| `status` | CharField | `draft \| published \| archived` |
| `price` | DecimalField | default `0` (gratuito) |
| `rating` | DecimalField | — |
| `require_sequential_progress` | BooleanField | Candado por orden |
| `requires_final_evaluation` | BooleanField | Exige eval final para certificado |
| `final_evaluation_duration_default` | PositiveIntegerField | Minutos por defecto |
| `created_at`, `updated_at` | DateTimeField | — |

#### `Module`

| Campo | Tipo | Notas |
|---|---|---|
| `course` | ForeignKey | FK a Course (`modules`) |
| `title` | CharField | — |
| `description` | TextField | nullable |
| `order` | PositiveIntegerField | — |

#### `Lesson`

| Campo | Tipo | Notas |
|---|---|---|
| `module` | ForeignKey | FK a Module (`lessons`) |
| `title` | CharField | — |
| `description` | TextField | nullable |
| `video_url` | URLField | nullable |
| `duration` | PositiveIntegerField | Segundos |
| `order` | PositiveIntegerField | — |
| `video_provider` | CharField | `youtube \| bunny \| cloudflare \| mux \| s3` |

#### `CourseMaterial`

| Campo | Tipo | Notas |
|---|---|---|
| `course` | ForeignKey | FK a Course |
| `module` | ForeignKey | FK a Module, nullable |
| `lesson` | ForeignKey | FK a Lesson, nullable |
| `title`, `description` | CharField/TextField | — |
| `file` | FileField | Archivo subido |
| `file_type` | CharField | `pdf \| pptx \| ppt \| docx \| doc \| xlsx \| xls \| image \| other` |
| `file_size` | PositiveIntegerField | Bytes |
| `original_filename` | CharField | — |
| `order` | PositiveIntegerField | — |
| `uploaded_by` | ForeignKey | FK a User |
| `download_count` | PositiveIntegerField | default `0` |

Límites aplicados en el serializer:
- Máximo **50 MB** por archivo
- Máximo **20 materiales** por lección
- Máximo **50 materiales** por módulo
- Máximo **100 materiales** por curso

---

### App: `quizzes`

#### `Quiz`

| Campo | Tipo | Notas |
|---|---|---|
| `module` | OneToOneField | FK a Module |
| `title` | CharField | — |
| `passing_score` | PositiveIntegerField | Porcentaje, default `70` |

#### `Question`

| Campo | Tipo | Notas |
|---|---|---|
| `quiz` | ForeignKey | FK a Quiz |
| `text` | TextField | Enunciado |
| `order` | PositiveIntegerField | — |
| `question_type` | CharField | Ver tabla de tipos abajo |
| `options` | JSONField | Lista de opciones |
| `correct_answer` | PositiveIntegerField | Índice base-0, nullable |
| `config` | JSONField | Configuración específica por tipo |

Tipos de pregunta disponibles:
`multiple_choice \| true_false \| word_search \| matching \| word_order \| crossword \| fill_blank`

#### `QuizAttempt`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `quiz` | ForeignKey | FK a Quiz |
| `answers` | JSONField | `{question_id: answer}` |
| `score` | DecimalField | Porcentaje 0-100 |
| `passed` | BooleanField | — |
| `attempted_at` | DateTimeField | auto_now_add |

#### `FinalEvaluation`

| Campo | Tipo | Notas |
|---|---|---|
| `course` | OneToOneField | FK a Course |
| `title` | CharField | — |
| `passing_score` | PositiveIntegerField | Porcentaje, default `70` |

#### `FinalEvaluationQuestion`

| Campo | Tipo | Notas |
|---|---|---|
| `evaluation` | ForeignKey | FK a FinalEvaluation |
| `text` | TextField | — |
| `options` | JSONField | — |
| `correct_answer` | PositiveIntegerField | — |
| `order` | PositiveIntegerField | — |

#### `FinalEvaluationRequest`

| Campo | Tipo | Notas |
|---|---|---|
| `student` | ForeignKey | FK a User |
| `course` | ForeignKey | FK a Course |
| `evaluation` | ForeignKey | FK a FinalEvaluation |
| `status` | CharField | `pending \| approved \| expired \| completed \| failed` |
| `requested_at` | DateTimeField | auto_now_add |
| `approved_at` | DateTimeField | nullable |
| `available_from` | DateTimeField | Inicio de ventana de tiempo |
| `available_until` | DateTimeField | Fin de ventana de tiempo |

Restricción: solo un request activo (`pending` o `approved`) por alumno + curso.

#### `FinalEvaluationAttempt`

| Campo | Tipo | Notas |
|---|---|---|
| `student` | ForeignKey | FK a User |
| `evaluation` | ForeignKey | FK a FinalEvaluation |
| `request` | ForeignKey | FK a FinalEvaluationRequest, nullable |
| `answers` | JSONField | — |
| `score` | DecimalField | — |
| `passed` | BooleanField | — |
| `attempted_at` | DateTimeField | — |

---

### App: `progress`

#### `Purchase`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `course` | ForeignKey | FK a Course |
| `amount` | DecimalField | — |
| `status` | CharField | `pending \| completed \| failed` |
| `payment_method` | CharField | — |
| `paid_at` | DateTimeField | nullable |

Restricción: `unique_together(user, course)`

#### `Enrollment`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `course` | ForeignKey | FK a Course |
| `enrolled_at` | DateTimeField | auto_now_add |

Restricción: `unique_together(user, course)`

#### `LessonProgress`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `lesson` | ForeignKey | FK a Lesson |
| `completed` | BooleanField | — |
| `completed_at` | DateTimeField | nullable |
| `video_position_seconds` | PositiveIntegerField | Para reanudar reproducción |

Restricción: `unique_together(user, lesson)`

#### `UserActivity`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `action` | CharField(50) | ej. `course_enrolled`, `lesson_completed`, `quiz_attempted` |
| `resource_type` | CharField(50) | Tipo de recurso afectado |
| `resource_id` | CharField | ID del recurso |
| `metadata` | JSONField | Datos adicionales |
| `created_at` | DateTimeField | auto_now_add |

Índices de base de datos: `(user, -created_at)` y `(action, -created_at)`

---

### App: `qna`

#### `QnAQuestion`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User |
| `lesson` | ForeignKey | FK a Lesson |
| `title` | CharField | — |
| `body` | TextField | — |
| `created_at`, `updated_at` | DateTimeField | — |

#### `QnAAnswer`

| Campo | Tipo | Notas |
|---|---|---|
| `question` | ForeignKey | FK a QnAQuestion |
| `user` | ForeignKey | FK a User |
| `body` | TextField | — |
| `is_accepted` | BooleanField | — |
| `created_at`, `updated_at` | DateTimeField | — |

Orden por defecto: respuestas aceptadas primero (`-is_accepted, created_at`).

---

### App: `certificates`

#### `Certificate`

| Campo | Tipo | Notas |
|---|---|---|
| `user` | ForeignKey | FK a User (`certificates`) |
| `course` | ForeignKey | FK a Course |
| `verification_code` | UUIDField | `unique=True`, autogenerado |
| `issued_at` | DateTimeField | auto_now_add |

Restricción: `unique_together(user, course)`

---

## 4. Permisos y Roles del Sistema

### Roles Globales (campo `role` en `User`)

| Rol | Descripción |
|---|---|
| `student` | Usuario estándar. Puede inscribirse en cursos, hacer quizzes, obtener certificados. |
| `instructor` | Puede crear y gestionar sus propios cursos, ver analytics de sus cursos, gestionar alumnos y Q&A. |
| `admin` | Acceso total al panel de administración. Puede gestionar usuarios, cursos, secciones y ver analytics. |
| `admin` + `is_super_admin=True` | Super Admin. Además gestiona membresías de sección corporativa y videos promocionales. |

### Roles de Sección (campo `role` en `SectionMembership`)

Estos roles son independientes del rol global y aplican solo dentro de una sección específica.

| Rol de Sección | Descripción |
|---|---|
| `student` | Acceso al contenido de la sección |
| `instructor` | Puede crear cursos en la sección |
| `admin` | Puede gestionar membresías de la sección |

### Clases de Permiso Definidas

#### `apps/users/permissions.py`

| Clase | Descripción |
|---|---|
| `IsAdmin` | Solo `role == 'admin'` |
| `IsSuperAdmin` | `role == 'admin'` **o** `is_super_admin == True` |
| `IsInstructor` | Solo `role == 'instructor'` |
| `IsStudent` | Solo `role == 'student'` |
| `IsAdminOrInstructor` | `role in ('admin', 'instructor')` |
| `IsInstructorOwner` | Instructor es dueño del objeto, o es admin |
| `IsOwnerOrAdmin` | Usuario es dueño del recurso o es admin |
| `ReadOnly` | Solo métodos SAFE (`GET`, `HEAD`, `OPTIONS`) |

#### `apps/sections/permissions.py`

| Clase | Descripción |
|---|---|
| `HasSectionAccess` | Secciones `public`: basta estar autenticado. Secciones `maily`/`corporate`: requiere `SectionMembership` activa y no expirada. |
| `IsSectionAdmin` | Membresía activa con `role=admin` en esa sección |
| `IsSectionInstructor` | Membresía activa con `role=instructor` en esa sección |
| `CanViewSectionPreview` | `allow_public_preview=True` en la sección |

#### `apps/courses/permissions.py`

| Clase | Descripción |
|---|---|
| `CanManageCourseMaterial` | Admin **o** instructor dueño del curso |
| `CanDownloadCourseMaterial` | Admin, instructor dueño, **o** alumno inscrito en el curso |
| `CanListCourseMaterials` | Admin, instructor dueño, **o** alumno inscrito en el curso |

---

## 5. Endpoints de la API

Base URL: `http://<servidor>/api/`

La documentación interactiva está disponible en:
- Swagger UI: `/api/docs/`
- ReDoc: `/api/redoc/`

---

### Autenticación — `/api/auth/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| POST | `register/` | Registro de estudiante | Público |
| POST | `login/` | Login JWT con rate limiting | Público |
| POST | `refresh/` | Renovar access token | Público (con refresh token) |
| GET/PATCH | `me/` | Perfil del usuario autenticado | Autenticado |
| GET/POST | `survey/` | Encuesta de intereses | Autenticado |
| POST | `password-reset/request/` | Solicitar reset por email | Público |
| POST | `password-reset/confirm/` | Confirmar nueva contraseña | Público (con token) |

---

### Gestión de Usuarios — `/api/users/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `` | Listar todos los usuarios | Admin |
| POST | `instructors/` | Crear instructor | Admin |
| GET/PATCH/DELETE | `{pk}/` | Gestionar usuario (soft-delete) | Admin |
| POST | `{pk}/change-password/` | Cambiar contraseña de usuario | Admin |
| POST | `{pk}/unlock/` | Desbloquear cuenta bloqueada | Admin |

---

### Cursos — `/api/courses/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `` | Lista de cursos publicados | Autenticado |
| POST | `` | Crear curso | Admin / Instructor |
| GET | `recommended/` | Cursos recomendados por encuesta | Autenticado |
| POST | `upload-thumbnail/` | Subir thumbnail a Cloudinary | Admin / Instructor |
| GET/PATCH/DELETE | `{pk}/` | Detalle y gestión del curso | GET: autenticado; resto: dueño o admin |
| GET/POST | `{id}/materials/` | Listar / subir materiales del curso | Ver permisos de materiales |
| POST | `{id}/modules/` | Crear módulo | Instructor dueño / Admin |
| PATCH | `{id}/modules/reorder/` | Reordenar módulos | Instructor dueño / Admin |
| GET/PATCH/DELETE | `modules/{pk}/` | Gestionar módulo | Instructor dueño / Admin |
| POST | `modules/{id}/lessons/` | Crear lección | Instructor dueño / Admin |
| PATCH | `modules/{id}/lessons/reorder/` | Reordenar lecciones | Instructor dueño / Admin |
| GET/PATCH/DELETE | `lessons/{pk}/` | Gestionar lección | Instructor dueño / Admin |

---

### Materiales — `/api/materials/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET/PATCH/DELETE | `{pk}/` | Detalle de material | Admin / Instructor dueño |
| GET | `{pk}/download/` | Descarga archivo (incrementa contador) | Admin / Instructor dueño / Inscrito |

---

### Categorías — `/api/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `categories/` | Lista de categorías activas | Público |
| GET | `categories/{slug}/` | Detalle con subcategorías | Público |
| GET/POST | `admin/categories/` | CRUD de categorías | Admin |
| GET/PATCH/DELETE | `admin/categories/{slug}/` | Gestionar categoría | Admin |

---

### Secciones — `/api/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `sections/` | Lista de secciones activas | Público |
| GET | `sections/my-sections/` | Secciones del usuario autenticado | Autenticado |
| GET | `sections/{slug}/` | Detalle de sección | Público |
| GET | `sections/{slug}/preview/` | Cursos de preview | Sección con `allow_public_preview` |
| GET | `sections/{slug}/courses/` | Cursos de la sección | Miembro de la sección |
| GET | `sections/{slug}/promo-videos/` | Videos promocionales | Público |
| GET/POST | `admin/sections/{slug}/members/` | Listar / otorgar membresía | Admin / Super Admin |
| PATCH/DELETE | `admin/sections/{slug}/members/{user_id}/` | Modificar / revocar membresía | Admin / Super Admin |
| GET/POST | `admin/sections/{slug}/promo-videos/` | CRUD de videos promocionales | Super Admin |
| GET/PATCH/DELETE | `admin/sections/{slug}/promo-videos/{pk}/` | Gestionar video promocional | Super Admin |

---

### Quizzes y Evaluaciones — `/api/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `modules/{id}/quiz/` | Obtener quiz del módulo | Autenticado |
| POST | `modules/{id}/quiz/create/` | Crear quiz | Instructor dueño / Admin |
| GET/PATCH/DELETE | `quizzes/{id}/` | Gestionar quiz | Instructor dueño / Admin |
| POST | `quizzes/{id}/questions/` | Agregar pregunta | Instructor dueño / Admin |
| POST | `quizzes/{id}/attempt/` | Enviar respuestas (califica automáticamente) | Inscrito |
| GET | `quizzes/{id}/results/` | Intentos del usuario | Autenticado |
| GET/PATCH/DELETE | `questions/{pk}/` | Gestionar pregunta | Instructor dueño / Admin |
| GET | `courses/{id}/final-evaluation/` | Obtener evaluación final | Autenticado |
| GET/POST | `courses/{id}/final-evaluation/request/` | Solicitar evaluación final | Inscrito |
| GET/PUT | `courses/{id}/final-evaluation/admin/` | Gestión admin de evaluación final | Admin |
| POST | `final-evaluations/{id}/attempt/` | Enviar evaluación final | Inscrito (con request aprobado) |
| POST | `final-evaluations/{id}/questions/` | Agregar pregunta a eval. final | Admin |
| GET/PATCH/DELETE | `final-evaluation-questions/{pk}/` | Gestionar pregunta | Admin |
| GET | `instructor/evaluations/requests/` | Lista de solicitudes de eval. final | Instructor |
| POST | `instructor/evaluations/requests/{pk}/approve/` | Aprobar y definir ventana de tiempo | Instructor |

---

### Progreso y Compras — `/api/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `admin/purchases/` | Lista de compras completadas | Admin |
| GET | `admin/analytics/revenue/` | Analytics de ingresos | Admin |
| GET | `admin/analytics/users/` | Analytics de usuarios | Admin |
| GET | `admin/analytics/courses/` | Analytics de cursos | Admin |
| POST | `courses/{id}/enroll/` | Inscribirse en curso gratuito | Autenticado |
| POST | `courses/{id}/purchase/` | Pago simulado para curso de pago | Autenticado |
| GET | `courses/{id}/students/` | Alumnos inscritos en el curso | Instructor dueño / Admin |
| POST | `lessons/{id}/complete/` | Marcar lección como completada | Inscrito |
| PATCH | `lessons/{id}/position/` | Guardar posición del video | Inscrito |
| GET | `progress/courses/{id}/` | Progreso del usuario en un curso | Inscrito |
| GET | `progress/dashboard/` | Resumen del dashboard del alumno | Autenticado |
| GET | `progress/instructor-stats/` | Total de alumnos del instructor | Instructor |

---

### Panel Instructor — `/api/instructor/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `students/` | Lista de alumnos con filtros (`search`, `course`) | Instructor |
| GET | `students/{pk}/` | Detalle del alumno con estadísticas | Instructor |
| GET | `students/{pk}/activity/` | Actividad reciente del alumno | Instructor |
| GET | `students/{pk}/certificates/` | Certificados del alumno | Instructor |
| GET | `students/{pk}/submissions/` | Entregas del alumno (stub, fase 6) | Instructor |
| GET | `courses/{pk}/analytics/` | Analytics detallados de un curso | Instructor dueño |

---

### Q&A — `/api/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `lessons/{id}/questions/` | Preguntas de una lección | Autenticado |
| POST | `lessons/{id}/questions/create/` | Crear pregunta | Autenticado |
| POST | `questions/{id}/answers/` | Responder una pregunta | Autenticado |
| PATCH | `answers/{id}/accept/` | Marcar respuesta como aceptada | Dueño de la pregunta |
| GET | `qna/instructor-stats/` | Estadísticas Q&A del instructor | Instructor |

---

### Certificados — `/api/certificates/`

| Método | URL | Descripción | Acceso |
|---|---|---|---|
| GET | `` | Mis certificados | Autenticado |
| GET | `verify/{code}/` | Verificación pública por UUID | Público |
| POST | `claim/{course_id}/` | Reclamar certificado | Inscrito (requisitos cumplidos) |
| GET | `{pk}/download/` | Descargar certificado en PDF | Dueño |

---

## 6. Frontend — Estructura

### Árbol de Directorios (`cursos-maily/src/`)

```
src/
├── App.jsx                    ← Punto de entrada: providers + rutas
├── main.jsx                   ← ReactDOM.createRoot
├── index.css                  ← Estilos globales (directivas Tailwind)
│
├── context/
│   ├── AuthContext.jsx        ← Sesión del usuario, tokens, auto-refresh
│   ├── SectionContext.jsx     ← Sección activa (Maily/Longevity/Corporativo)
│   ├── ProgressContext.jsx    ← Progreso de cursos, quizzes, certificados
│   └── ThemeContext.jsx       ← Dark/Light mode (persiste en localStorage)
│
├── services/
│   ├── api.js                 ← Instancia Axios + interceptores JWT
│   ├── authService.js
│   ├── courseService.js
│   ├── adminService.js
│   ├── instructorService.js
│   ├── progressService.js
│   ├── quizService.js
│   ├── evaluationService.js
│   ├── certificateService.js
│   ├── categoryService.js
│   ├── materialService.js
│   ├── qnaService.js
│   ├── blogService.js
│   ├── userService.js
│   └── uploadService.js
│
├── pages/
│   ├── index.js               ← Barrel de exportaciones
│   ├── Auth.jsx               ← Login y registro combinados
│   ├── Dashboard.jsx          ← Panel principal del estudiante
│   ├── CoursesList.jsx        ← Catálogo con filtros y categorías
│   ├── CourseView.jsx         ← Detalle del curso, inscripción, compra
│   ├── LessonView.jsx         ← Reproductor de video inmersivo (sin navbar)
│   ├── QuizView.jsx           ← Quiz inmersivo
│   ├── FinalEvaluationView.jsx← Evaluación final inmersiva
│   ├── MyCourses.jsx          ← Cursos inscritos del estudiante
│   ├── Certificates.jsx       ← Lista y descarga de certificados
│   ├── Profile.jsx            ← Edición de perfil con recorte de avatar
│   ├── ChooseSection.jsx      ← Selector de portal (multi-sección)
│   ├── Survey.jsx             ← Encuesta de intereses post-registro
│   ├── Landing.jsx            ← Página de presentación pública
│   ├── MailyPresentacion.jsx  ← Presentación de Maily Academia
│   ├── CertificateVerify.jsx  ← Verificación pública de certificado
│   ├── ForgotPassword.jsx     ← Solicitar reset de contraseña
│   ├── ResetPassword.jsx      ← Confirmar nueva contraseña con token
│   │
│   ├── maily/
│   │   ├── MailyDashboard.jsx ← Wrapper: setCurrentSection + Dashboard
│   │   └── MailyCourses.jsx   ← Wrapper: CoursesList con sectionSlug
│   ├── longevity/
│   │   ├── LongevityDashboard.jsx
│   │   └── LongevityCourses.jsx
│   ├── corporativo/
│   │   ├── CorporativoDashboard.jsx
│   │   └── CorporativoCourses.jsx
│   │
│   ├── admin/
│   │   ├── AdminDashboard.jsx          ← KPIs, gráficas, top cursos
│   │   ├── UserManagement.jsx          ← CRUD de usuarios
│   │   ├── CourseManagement.jsx        ← Todos los cursos
│   │   └── PromoVideosManagement.jsx   ← Videos promocionales (super-admin)
│   │
│   └── instructor/
│       ├── InstructorDashboard.jsx
│       ├── MyCourses.jsx               ← Cursos del instructor con CRUD
│       ├── CourseBuilder.jsx           ← Editor de contenido full-screen
│       ├── StudentManagement.jsx       ← Lista de alumnos
│       ├── StudentDetail.jsx           ← Detalle de alumno
│       ├── CourseAnalytics.jsx         ← Analytics por curso
│       ├── QnAPanel.jsx                ← Q&A pendientes
│       ├── InstructorEvaluationsPanel.jsx ← Solicitudes de eval. final
│       └── BlogManagement.jsx          ← Entradas de blog
│
├── components/
│   ├── layout/
│   │   ├── MainLayout.jsx     ← Navbar + Outlet (marco de la app)
│   │   ├── Navbar.jsx         ← Barra adaptativa por rol, selector de sección
│   │   └── index.js
│   ├── quiz/
│   │   ├── QuizRenderer.jsx   ← Dispatcher de tipos de quiz
│   │   ├── MultipleChoice.jsx
│   │   ├── TrueFalse.jsx
│   │   ├── Matching.jsx
│   │   ├── FillBlank.jsx
│   │   ├── WordSearch.jsx
│   │   ├── WordOrder.jsx
│   │   └── Crossword.jsx
│   ├── ui/
│   │   ├── Button.jsx, Input.jsx, Card.jsx
│   │   ├── Modal.jsx, Badge.jsx, ProgressBar.jsx
│   │   └── index.js
│   ├── ImageCropModal.jsx     ← Recorte con react-easy-crop
│   ├── VideoPreview.jsx       ← Multiproveedor (YouTube/Bunny/Cloudflare/Mux/S3)
│   ├── YouTubePlayer.jsx
│   └── PaymentModal.jsx       ← Modal de pago con tarjeta
│
└── data/
    ├── courses.js             ← Datos estáticos de ejemplo
    └── locations.js           ← Países, estados y ciudades (México)
```

### Jerarquía de Providers

```
ThemeProvider
  └── BrowserRouter
        └── AuthProvider
              └── SectionContextProvider
                    └── ProgressProvider
                          └── AppRoutes
```

### Guards de Rutas

| Guard | Descripción |
|---|---|
| `ProtectedRoute` | Redirige a `/` si el usuario no está autenticado |
| `PublicRoute` | Redirige al dashboard si el usuario ya está autenticado |
| `RoleRoute` | Verifica que el usuario tenga uno de los roles permitidos |
| `SuperAdminRoute` | Acceso exclusivo a rol `admin` |

### Tabla Completa de Rutas

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `Auth` | Público (redirige si autenticado) |
| `/forgot-password` | `ForgotPassword` | Público |
| `/reset-password/:token` | `ResetPassword` | Público |
| `/verify/:code` | `CertificateVerify` | Público |
| `/choose-section` | `ChooseSection` | Autenticado |
| `/profile` | `Profile` | Autenticado (todos los roles) |
| `/admin/dashboard` | `AdminDashboard` | Rol: `admin` |
| `/admin/users` | `UserManagement` | Rol: `admin` |
| `/admin/courses` | `CourseManagement` | Rol: `admin` |
| `/admin/promo-videos` | `PromoVideosManagement` | Rol: `admin` (super) |
| `/instructor/dashboard` | `InstructorDashboard` | Rol: `instructor` |
| `/instructor/courses` | `InstructorMyCourses` | Rol: `instructor` |
| `/instructor/courses/:courseId/edit` | `CourseBuilder` | Rol: `instructor` o `admin` (full-screen) |
| `/instructor/courses/:courseId/analytics` | `CourseAnalytics` | Rol: `instructor` |
| `/instructor/students` | `StudentManagement` | Rol: `instructor` |
| `/instructor/students/:id` | `StudentDetail` | Rol: `instructor` |
| `/instructor/qna` | `QnAPanel` | Rol: `instructor` |
| `/instructor/evaluations` | `InstructorEvaluationsPanel` | Rol: `instructor` |
| `/instructor/blog` | `BlogManagement` | Rol: `instructor` |
| `/dashboard` | `Dashboard` | Rol: `student` |
| `/maily/dashboard` | `MailyDashboard` | Rol: `student` |
| `/longevity/dashboard` | `LongevityDashboard` | Rol: `student` |
| `/corporativo/dashboard` | `CorporativoDashboard` | Rol: `student` |
| `/my-courses` | `MyCourses` | Rol: `student` |
| `/courses` | `CoursesList` | Rol: `student` |
| `/maily/courses` | `MailyCourses` | Rol: `student` |
| `/longevity/courses` | `LongevityCourses` | Rol: `student` |
| `/corporativo/courses` | `CorporativoCourses` | Rol: `student` |
| `/course/:courseId` | `CourseView` | Rol: `student` |
| `/certificates` | `Certificates` | Rol: `student` |
| `/survey` | `Survey` | Rol: `student` |
| `/maily-academia/presentacion` | `MailyPresentacion` | Rol: `student` |
| `/course/:courseId/lesson/:moduleId/:lessonId` | `LessonView` | Autenticado (inmersivo) |
| `/course/:courseId/quiz/:moduleId` | `QuizView` | Autenticado (inmersivo) |
| `/course/:courseId/evaluation` | `FinalEvaluationView` | Autenticado (inmersivo) |

---

## 7. Servicios del Frontend

### `api.js` — Capa Base de Axios

- `baseURL`: `VITE_API_URL` || `http://localhost:8000/api`
- **Interceptor de request**: adjunta `Authorization: Bearer <accessToken>` a cada llamada
- **Interceptor de response (401)**: refresca automáticamente el token con `POST /auth/refresh/`, encola las requests fallidas y las reintenta. Si el refresh falla, limpia tokens y redirige a `/`
- **Almacenamiento de tokens**: `accessToken` en memoria (variable de módulo), `refreshToken` en `sessionStorage`

### Resumen de Servicios

| Servicio | Métodos principales |
|---|---|
| `authService` | `login`, `register`, `getMe`, `updateProfile`, `getSurvey`, `saveSurvey`, `requestPasswordReset`, `confirmPasswordReset` |
| `courseService` | `list`, `getRecommended`, `listBySection`, `getById`, `create`, `update`, `remove`, `enroll`, `purchaseCourse`, `getStudents`, `createModule`, `updateModule`, `deleteModule`, `createLesson`, `updateLesson`, `deleteLesson`, `reorderModules`, `reorderLessons` |
| `adminService` | `getPurchases`, `getRevenueAnalytics`, `getUsersAnalytics`, `getCoursesAnalytics` |
| `instructorService` | `getStudents`, `getStudentDetail`, `getStudentActivity`, `getStudentCertificates`, `getStudentSubmissions`, `getCourseAnalytics` |
| `progressService` | `completeLesson`, `getCourseProgress`, `updateLessonPosition`, `getDashboard`, `getInstructorStats` |
| `quizService` | `getByModule`, `create`, `update`, `remove`, `addQuestion`, `updateQuestion`, `removeQuestion`, `submitAttempt`, `getResults` |
| `evaluationService` | `getEvalRequest`, `requestFinalEvaluation`, `getFinalEvaluation`, `submitFinalEvaluation`, `listRequests`, `approveRequest`, `getAdminEvaluation`, `updateAdminEvaluation`, `addFinalQuestion`, `updateFinalQuestion`, `removeFinalQuestion` |
| `certificateService` | `list`, `claim`, `verify`, `downloadPdf` |
| `categoryService` | `list` |
| `materialService` | `list`, `upload`, `download`, `update`, `remove` |
| `qnaService` | `getQuestions`, `createQuestion`, `createAnswer`, `acceptAnswer`, `getInstructorStats` |

---

## 8. Reglas de Negocio

### Autenticación y Seguridad

- El login usa el **email** como identificador (no el username).
- **Bloqueo de cuenta**: tras **5 intentos fallidos** consecutivos, la cuenta se bloquea durante **30 minutos**. El backend responde con `{ error: "account_locked", locked_until, remaining_minutes }`. Al frontend le muestra un aviso con el tiempo restante.
- **Rate limiting** en el endpoint de login: **5 requests por minuto** por IP (throttle `auth`).
- **Complejidad de contraseña**: mínimo 10 caracteres, al menos una mayúscula, un número y un carácter especial (validado tanto en backend como en frontend).
- Los **refresh tokens** tienen rotación: cada vez que se usa uno, se emite uno nuevo.
- La sesión se restaura al recargar la app usando el `refreshToken` almacenado en `sessionStorage`.

### Flujo de Login y Redirección

Al hacer login exitoso, el backend retorna `redirect_section` y `sections` (slugs de secciones del usuario). La lógica de redirección en el frontend es:

1. Si el usuario tiene acceso a la sección **corporativo** → `/corporativo/dashboard`
2. Si tiene acceso a **maily** → `/maily/dashboard`
3. Si tiene acceso a **longevity-360** → `/longevity/dashboard`
4. Si tiene múltiples secciones → `/choose-section` (selector)

### Registro y Encuesta

- El username se **autogenera** desde nombre + apellido al registrarse.
- Después del primer login, si `has_completed_survey == false`, el usuario es dirigido a `/survey`.
- La encuesta captura `occupation_type` e `interests` (lista de slugs) y se usa para las **recomendaciones de cursos**.

### Secciones (Portales de Contenido)

| Sección | Tipo | Acceso |
|---|---|---|
| Longevity 360 | `public` | Cualquier usuario autenticado |
| Maily Academia | `maily` | Requiere `SectionMembership` activa |
| Corporativo CAMSA | `corporate` | Requiere `SectionMembership` activa |

- Solo un **Super Admin** puede gestionar membresías de la sección corporativa y los videos promocionales.
- Las membresías pueden tener **fecha de expiración**. Expiradas, se bloquea el acceso automáticamente.
- Si `allow_public_preview = True`, los cursos de la sección son visibles sin membresía (solo lectura).

### Cursos y Contenido

- Solo los cursos con `status = 'published'` son visibles para los estudiantes.
- Los instructores solo pueden gestionar **sus propios cursos** (no los de otros).
- Un admin puede gestionar cualquier curso.
- Un curso pertenece opcionalmente a una **sección** y a una **categoría**.
- El `price = 0` indica curso **gratuito** (flujo de inscripción directa). Si `price > 0`, requiere flujo de compra.
- Los cursos tienen `tags` (lista de strings) para categorización adicional.

### Progreso Secuencial

- Si `require_sequential_progress = True` en el curso, las lecciones aparecen **bloqueadas** hasta que el alumno complete la anterior.
- El frontend muestra un candado visual en las lecciones no desbloqueadas.
- La posición de reproducción del video se guarda en `LessonProgress.video_position_seconds` para reanudar desde donde el alumno dejó.

### Inscripción y Compra

- **Cursos gratuitos**: `POST /courses/{id}/enroll/` → crea `Enrollment` directo.
- **Cursos de pago**: `POST /courses/{id}/purchase/` con datos de tarjeta mock → crea `Purchase` + `Enrollment`. El pago es simulado (no hay pasarela real).
- Un alumno no puede inscribirse dos veces en el mismo curso (restricción `unique_together`).

### Evaluación Final

Flujo de estados de `FinalEvaluationRequest`:

```
                        ┌──────────────────────────────┐
  Alumno solicita       │                              │
  ──────────────►  pending  ──► approved ──► completed │
                        │            │                  │
                        │            └──► expired       │
                        │            └──► failed        │
                        └──────────────────────────────┘
```

1. El alumno solicita la evaluación (`POST .../request/`). Solo se puede tener **un request activo** (pending o approved) por alumno y curso.
2. El instructor **aprueba** la solicitud y define la **ventana de tiempo** (`duration_minutes`, entre 1 y 10080 minutos = 7 días).
3. El alumno rinde la evaluación dentro de la ventana (`POST .../attempt/`). Fuera de la ventana, el sistema marca el request como `expired`.
4. Si el alumno **pasa** la evaluación (`score >= passing_score`), se emite automáticamente el **certificado**.

### Certificados

- Un certificado se puede reclamar (`POST /certificates/claim/{course_id}/`) cuando se cumplen **todos** los requisitos:
  - Todas las lecciones completadas
  - Todos los quizzes aprobados
  - Si `requires_final_evaluation = True`: evaluación final aprobada
- Cada certificado tiene un **UUID de verificación** único y público.
- La URL `/verify/:code` es pública y permite verificar la autenticidad del certificado sin login.
- El PDF se genera dinámicamente en el backend con **ReportLab** usando la plantilla `staticfiles/certificates/maily_template.png`.

### Materiales de Apoyo

- Los materiales pueden adjuntarse a nivel de **curso**, **módulo** o **lección**.
- Tipos permitidos: `pdf`, `pptx`, `ppt`, `docx`, `doc`, `xlsx`, `xls`, `image`, `other`.
- **Límites de cantidad**:
  - 20 materiales por lección
  - 50 materiales por módulo
  - 100 materiales por curso
- **Límite de tamaño**: 50 MB por archivo.
- Solo el admin y el instructor dueño pueden subir y gestionar materiales.
- Los alumnos **inscritos** pueden descargar materiales. Cada descarga incrementa `download_count`.

### Recomendaciones de Cursos

- El endpoint `GET /courses/recommended/` devuelve cursos filtrados por los **intereses de la encuesta** del usuario.
- Los intereses se almacenan como slugs en `SurveyResponse.interests`.

### Analytics (Admin)

Tres endpoints de analytics para el panel de administrador:

| Endpoint | Datos disponibles |
|---|---|
| `/admin/analytics/revenue/` | Ingresos con tendencias periódicas (diario/semanal/mensual/anual), comparación vs período anterior |
| `/admin/analytics/users/` | Usuarios por rol, por sección, por país |
| `/admin/analytics/courses/` | Tasas de completado, top cursos por ingresos e inscripciones |

### Tracking de Actividad

- Cada acción relevante del usuario se registra en `UserActivity` vía `activity_logger.py`.
- Acciones registradas: `course_enrolled`, `lesson_completed`, `quiz_attempted`, entre otras.
- El instructor puede ver la actividad reciente de sus alumnos desde `GET /instructor/students/{pk}/activity/`.

---

## 9. Componentes de Quiz

### Tipos de Pregunta

| Tipo (`question_type`) | Componente Frontend | Descripción |
|---|---|---|
| `multiple_choice` | `MultipleChoice.jsx` | Selección de una opción entre varias |
| `true_false` | `TrueFalse.jsx` | Verdadero o Falso |
| `matching` | `Matching.jsx` | Relacionar pares (columna A ↔ columna B) |
| `fill_blank` | `FillBlank.jsx` | Completar espacios en blanco en un texto |
| `word_search` | `WordSearch.jsx` | Encontrar palabras en una sopa de letras |
| `word_order` | `WordOrder.jsx` | Ordenar palabras para formar una oración |
| `crossword` | `Crossword.jsx` | Completar un crucigrama |

### `QuizRenderer.jsx`

Actúa como dispatcher: recibe la pregunta y según `question.question_type` renderiza el componente correspondiente.

### Sanitización de Respuestas

- Para **alumnos**: el serializer `QuestionSerializer` elimina del campo `config` las respuestas correctas antes de enviarlas al frontend.
- Para **instructores y admins**: el `QuestionAdminSerializer` incluye `correct_answer` y el `config` completo.

### Calificación Automática

La calificación de quizzes se realiza en el backend a través de `graders.py` al recibir `POST /quizzes/{id}/attempt/`. El score se calcula como porcentaje de respuestas correctas y se compara con `passing_score` para determinar si el intento fue aprobado.

---

## 10. Comandos Útiles

### Poblar Base de Datos con Datos de Prueba

```bash
# Poblar con datos de demo (usuarios, secciones, cursos, quizzes)
python manage.py seed_data

# Limpiar y repoblar desde cero
python manage.py seed_data --flush

# Alias equivalente
python manage.py seed_demo_academy --flush
```

**Datos generados por `seed_data`:**

| Tipo | Cantidad / Detalle |
|---|---|
| Admin | 1 → `admin@maily.com` |
| Instructores | 3 usuarios |
| Estudiantes | Varios |
| Secciones | Longevity 360 (public), Maily Academia (maily), Corporativo CAMSA (corporate) |
| Categorías | Por sección |
| Cursos | Varios con módulos, lecciones y quizzes completos |
| Membresías | Estudiantes e instructores asignados a secciones |

### Otros Comandos de Django

```bash
# Aplicar migraciones
python manage.py migrate

# Crear superusuario de Django admin
python manage.py createsuperuser

# Iniciar servidor de desarrollo
python manage.py runserver

# Verificar estado de migraciones
python manage.py showmigrations
```

### Iniciar el Frontend

```bash
cd cursos-maily

# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de producción
npm run build
```

### Variable de Entorno Clave del Frontend

```env
VITE_API_URL=http://localhost:8000/api
```

---

*Fin del documento. Para actualizar esta documentación, revisar los archivos de modelos, vistas, serializers y URLs de cada app del backend, y los archivos de rutas y servicios del frontend.*
