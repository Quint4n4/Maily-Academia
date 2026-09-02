# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maily Academia is a multi-section e-learning platform with three portals (Maily Academia, Longevity 360, Corporativo CAMSA). Each section has independent membership, courses, and access rules.

**Language:** The codebase, comments, commit messages, and documentation are in Spanish.

## Tech Stack

- **Frontend:** React 19 + Vite 5.4 + Tailwind CSS 3.4 (`cursos-maily/`)
- **Backend:** Django 5.1 + Django REST Framework 3.15 (`backend/`)
- **Database:** PostgreSQL 16
- **Auth:** JWT (access 2h, refresh 7d with rotation)
- **Images:** Cloudinary
- **PDF Certificates:** ReportLab (backend), jspdf/html2canvas (frontend)
- **Deployment:** Railway (both services), Docker Compose for local dev

## Development Commands

### Frontend (`cursos-maily/`)
```bash
cd cursos-maily
npm install
npm run dev        # Vite dev server on localhost:5173
npm run build      # Production build to dist/
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

### Backend (`backend/`)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data           # Populate test data
python manage.py runserver            # Dev server on localhost:8000
python manage.py makemigrations <app> # Create migration for specific app
```

### Docker (full stack)
```bash
docker-compose up    # PostgreSQL + Django backend with auto-migrations
```

The frontend connects to `localhost:8000` in dev. CORS is configured for `localhost:5173`.

## Architecture

### Backend Apps (`backend/apps/`)

| App | Purpose |
|---|---|
| `users` | Auth, roles (admin/instructor/student), profiles, password reset, login lockout |
| `sections` | Multi-section architecture with slug-based routing, membership with expiration |
| `courses` | Courses, modules, lessons, categories, materials; multi-video-provider support |
| `quizzes` | 7 question types (multiple_choice, true_false, matching, word_search, fill_blank, word_order, crossword) |
| `progress` | Progress tracking, purchases, enrollments, instructor analytics |
| `qna` | Q&A per lesson |
| `certificates` | Auto-issuance after completion, PDF generation, public verification |
| `blog` | Blog management (in development) |

Each app follows: `models.py`, `views.py`, `serializers.py`, `urls.py`, `permissions.py`.

### API Routes (all under `/api/`)

`auth/`, `users/`, `courses/`, `materials/`, `categories/`, `sections/`, `quizzes/`, `progress/`, `instructor/`, `qna/`, `blog/`, `certificates/`. API docs at `/api/docs/` (Swagger) and `/api/redoc/`.

### Frontend Structure (`cursos-maily/src/`)

- **Contexts:** `AuthContext` (JWT/session), `SectionContext` (active portal), `ProgressContext` (course progress), `ThemeContext` (dark/light mode)
- **Services:** One service file per backend app in `services/`, all use the Axios instance from `services/api.js` which handles JWT interceptors
- **Route guards** in `App.jsx`: `ProtectedRoute`, `PublicRoute`, `RoleRoute`, `SuperAdminRoute`
- **Immersive views:** `LessonView`, `QuizView`, `FinalEvaluationView` render without navbar
- **Section-specific pages:** `pages/maily/`, `pages/longevity/`, `pages/corporativo/` each have their own dashboard and course list

### Key Patterns

- **Styling:** Tailwind CSS only — no inline styles or CSS modules. All components must support dark mode via `dark:` prefix classes.
- **Video providers:** `VideoPreview` component abstracts YouTube, Bunny, Cloudflare, Mux, and S3. Course model stores `video_provider` + `video_id`.
- **Sequential progress:** Courses can optionally enforce lesson completion order.
- **Throttling:** Auth endpoints: 5 req/min. Users: 1000/hour. Anonymous: 100/hour.

## Reference Documentation

- `ARQUITECTURA.md` — Detailed architecture reference (models, endpoints, business rules)
- `PLAN_DE_IMPLEMENTACION.md` — 8-phase feature roadmap
- `IMPLEMENTACIONES/` — Timestamped records of completed implementations
- `.cursor/agents/` — Specialist agent configs with full context (frontend-dev, backend-maily, orquestador)
