# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maily Academia is a multi-section e-learning platform with three portals (Maily Academia, Longevity 360, Corporativo CAMSA). Each section has independent membership, courses, and access rules.

**Language:** The codebase, comments, commit messages, and documentation are in Spanish.

## Repo profile — read this first

The facts about this repo (stack, isolation model, auth, verifiers, compliance) live in
**`.claude/PERFIL-DEL-REPO.md`**, which is what the review skills read.

**This file does not repeat a single value from the profile. If they differ, the profile wins.**

This file keeps what the profile cannot hold: the *why* behind a decision, inherited traps, and
what is in production and must not be touched.

Not in the profile because it is prose, not a fact:

- **Images go through Cloudinary and PDF certificates through ReportLab** (backend) plus
  jspdf/html2canvas (frontend). The local `.env` holds real Cloudinary credentials — check whether
  they are the same account as production before uploading anything from a dev machine.
- **Both services deploy to Railway.** The frontend is `elegant-victory-production.up.railway.app`;
  the backend is `maily-academia-production-de9b.up.railway.app`. They are separate services.

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

### Docker (backend + database) — recommended for local dev
```bash
docker compose up -d          # PostgreSQL + Django, runs migrations and seed_data
docker compose logs -f backend
docker compose down           # stop; add -v to also wipe the database volume
```

**Local ports.** Ports 5432 and 8000 are taken by other projects on this machine,
so this stack publishes different ones:

| Service | Container port | Host port | URL |
|---|---|---|---|
| PostgreSQL | 5432 | **5435** | `postgresql://postgres@localhost:5435/maily_academia` |
| Django | 8000 | **8020** | http://localhost:8020 — API at `/api/`, docs at `/api/docs/` |
| Vite | — | 5173 | http://localhost:5173 |

The frontend reads `VITE_API_URL` from `cursos-maily/.env.local`, set to
`http://localhost:8020/api`. CORS is configured for `localhost:5173`.

`docker-compose.yml` reads `DB_NAME` / `DB_USER` / `DB_PASSWORD` from a `.env`
file at the repository root (not versioned); they must match `backend/.env`.

### Seed accounts (`seed_data`)

| Role | Email | Password | Section |
|---|---|---|---|
| admin | admin@maily.com | Admin12345! | all |
| instructor | maria.garcia@maily.com | Profesor12345! | maily-academia |
| instructor | carlos.rodriguez@maily.com | Profesor12345! | longevity-360 |
| instructor | ana.martinez@maily.com | Profesor12345! | corporativo-camsa |
| student | estudiante1@maily.com | Estudiante12345! | maily-academia, corporativo-camsa |
| student | estudiante2@maily.com | Estudiante12345! | longevity-360 |

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
