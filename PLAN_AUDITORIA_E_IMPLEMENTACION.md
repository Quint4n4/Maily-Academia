# AUDITORÍA COMPLETA Y PLAN DE IMPLEMENTACIÓN — Maily Academia

> Fecha: 2026-03-23
> Alcance: Seguridad, funcionalidad, pasarela Stripe, paneles (alumno/admin/instructor)

---

## PARTE 1: HALLAZGOS DE LA AUDITORÍA

### 1.1 SEGURIDAD — ISSUES CRÍTICOS

| # | Issue | Severidad | Archivo | Líneas |
|---|-------|-----------|---------|--------|
| S1 | **Datos de tarjeta enviados en texto plano al backend** — viola PCI-DSS completamente | CRÍTICO | `PaymentModal.jsx` / `progress/views.py` | 43-78 / 94-122 |
| S2 | **CourseStudentsView sin autorización de ownership** — cualquier usuario autenticado ve alumnos de cualquier curso | CRÍTICO | `progress/views.py` | 145-152 |
| S3 | **DEBUG=True por defecto** — si no se configura env var, expone stack traces en producción | ALTO | `config/settings.py` | 15 |
| S4 | **SECRET_KEY hardcodeada por defecto** — si no hay env var, usa clave insegura | ALTO | `config/settings.py` | 13 |
| S5 | **CORS demasiado amplio** — regex `r'^https://.*\.railway\.app$'` permite cualquier app de Railway | ALTO | `config/settings.py` | 188-191 |
| S6 | **Token blacklist deshabilitado** — refresh tokens viejos siguen válidos después de rotación | ALTO | `config/settings.py` | 175 |
| S7 | **Sin rate limiting en endpoints admin** — solo auth tiene throttle | MEDIO | `config/settings.py` | 161-165 |
| S8 | **Race condition en lockout de login** — requests concurrentes pueden resetear el contador | MEDIO | `users/views.py` | 40-147 |
| S9 | **Permisos faltantes en creación de módulos/lecciones** — instructor podría crear en curso ajeno | MEDIO | `courses/views.py` | 305, 328 |
| S10 | **Sin validación de tipo de archivo en materiales** — solo thumbnails tienen whitelist | MEDIO | `courses/views.py` | 467-509 |
| S11 | **Sin sanitización HTML en contenido generado por usuarios** — riesgo XSS en backend | MEDIO | `courses/serializers.py` | varios |
| S12 | **Refresh token en sessionStorage** — vulnerable a XSS; debería usar HttpOnly cookies | MEDIO | `services/api.js` | 5-12 |
| S13 | **Race condition en refresh de tokens** — window entre check y set de isRefreshing | MEDIO | `services/api.js` | 39-85 |
| S14 | **Sin audit logging** — acciones admin/instructor no se registran | BAJO | todo el backend | — |

### 1.2 FUNCIONALIDAD — PANEL ADMIN

| # | Issue | Severidad | Archivo |
|---|-------|-----------|---------|
| A1 | **Sin paginación en lista de usuarios** — carga todos de golpe | ALTO | `admin/UserManagement.jsx` |
| A2 | **Sin paginación en lista de cursos** — sin cursor ni infinite scroll | ALTO | `admin/CourseManagement.jsx` |
| A3 | **Admin no puede editar detalles de cursos** (título, precio, descripción) | MEDIO | `admin/CourseManagement.jsx` |
| A4 | **Sin operaciones bulk** — no puede activar/archivar múltiples cursos o usuarios | MEDIO | todos los panels admin |
| A5 | **Sin exportación de datos** — ni CSV ni PDF para reportes | MEDIO | `admin/AdminDashboard.jsx` |
| A6 | **Sin filtro por instructor en cursos** | BAJO | `admin/CourseManagement.jsx` |
| A7 | **Sin filtro de rango de fechas en analytics** — solo presets de periodo | BAJO | `admin/AdminDashboard.jsx` |
| A8 | **Sin confirmación antes de desactivar usuarios** | BAJO | `admin/UserManagement.jsx` |

### 1.3 FUNCIONALIDAD — PANEL INSTRUCTOR

| # | Issue | Severidad | Archivo |
|---|-------|-----------|---------|
| I1 | **QnAPanel carga O(n²)** — itera todos los cursos y luego todas las preguntas | ALTO | `instructor/QnAPanel.jsx:25-38` |
| I2 | **StudentManagement hardcodea límite de 50** — sin paginación real | ALTO | `instructor/StudentManagement.jsx:67` |
| I3 | **Sin filtros en Q&A** — no puede filtrar respondidas/pendientes, por curso, por fecha | MEDIO | `instructor/QnAPanel.jsx` |
| I4 | **Sin métricas de revenue para instructor** | MEDIO | `instructor/InstructorDashboard.jsx` |
| I5 | **Sin paginación en evaluaciones** | MEDIO | `instructor/InstructorEvaluationsPanel.jsx` |
| I6 | **Sin analytics de tendencias temporales** — solo datos actuales | BAJO | `instructor/CourseAnalytics.jsx` |
| I7 | **Sin acciones sobre estudiantes** — no puede enviar mensaje, revocar acceso, ajustar progreso | BAJO | `instructor/StudentDetail.jsx` |

### 1.4 FUNCIONALIDAD — PANEL ALUMNO

| # | Issue | Severidad | Archivo |
|---|-------|-----------|---------|
| E1 | **Video resume NO funciona para providers no-YouTube** — iframe siempre reinicia | ALTO | `LessonView.jsx:258-264` |
| E2 | **Catch blocks vacíos** — errores de enrollment/purchase/progress silenciados | ALTO | `CourseView.jsx:39,90`, `LessonView.jsx:68,90`, `QuizView.jsx:26` |
| E3 | **Cache de progreso nunca se invalida** — sin TTL ni refresh manual | MEDIO | `context/ProgressContext.jsx:19` |
| E4 | **Quiz sin límite de intentos** — modelo no tiene `max_attempts` | MEDIO | `quizzes/models.py` |
| E5 | **Certificado no muestra requisitos claros** — alumno no sabe qué path aplica | MEDIO | `certificates/views.py:85-99` |
| E6 | **Sin timer en evaluaciones finales** — frontend no muestra countdown | MEDIO | `FinalEvaluationView.jsx` |
| E7 | **Sección seleccionada no persiste** — se resetea a default en cada recarga | BAJO | `context/SectionContext.jsx:9-21` |
| E8 | **Sin skeleton loaders** — solo spinner genérico durante cargas | BAJO | múltiples páginas |
| E9 | **Accesibilidad deficiente** — sin ARIA labels en quizzes, sin keyboard nav en video, sin subtítulos | BAJO | múltiples componentes |

### 1.5 SISTEMA DE PAGOS — ESTADO ACTUAL

| Aspecto | Estado actual | Listo para Stripe? |
|---------|---------------|-------------------|
| Modelo Purchase | Campos básicos (user, course, amount, status) | NO — faltan stripe_payment_intent_id, stripe_customer_id, refunds |
| Procesamiento | **Simulado** — siempre marca COMPLETED sin cobrar | NO |
| Payment Intents | No existe | NO |
| Webhooks | No existe | NO |
| Reembolsos | No se rastrean | NO |
| 3D Secure | No soportado | NO |
| Moneda | Hardcoded MXN (backend) vs USD (frontend) | NO — conflicto |
| User Stripe ID | No existe campo en modelo User | NO |
| Frontend | Form custom que envía datos raw de tarjeta | NO — necesita Stripe Elements |
| Recibos | No se almacenan | NO |

---

## PARTE 2: PLAN DE IMPLEMENTACIÓN POR FASES

### Convenciones de agentes

| Agente | Responsabilidad | Archivos |
|--------|----------------|----------|
| **@backend** | Modelos, vistas, serializers, URLs, migraciones, permisos, webhooks | `backend/` |
| **@frontend** | Componentes, páginas, servicios, contextos, UI/UX | `cursos-maily/src/` |
| **@security** | Config de seguridad, headers, CORS, rate limiting, sanitización | `config/settings.py`, middleware, permisos |
| **@devops** | Variables de entorno, Docker, Railway, CI/CD | `docker-compose.yml`, `.env`, `railway.toml` |
| **@qa** | Testing manual/automatizado, validación de flujos | tests/, navegador |

---

## FASE 0: SEGURIDAD CRÍTICA (Prioridad máxima — antes de cualquier feature)

> **Objetivo:** Cerrar todas las vulnerabilidades críticas y altas antes de tocar funcionalidad.
> **Duración estimada:** 1 sprint

### @security — Hardening de configuración

- [ ] **S3** Cambiar `DEBUG` default a `False` en `config/settings.py:15`
- [ ] **S4** Hacer que `SECRET_KEY` falle si no hay env var (quitar default inseguro) en `config/settings.py:13`
- [ ] **S5** Restringir CORS a dominios exactos de producción (quitar regex broad) en `config/settings.py:188-191`
- [ ] **S6** Habilitar `BLACKLIST_AFTER_ROTATION: True` y agregar `rest_framework_simplejwt.token_blacklist` a `INSTALLED_APPS`
- [ ] **S7** Agregar throttle classes para endpoints admin: `'admin': '30/minute'`
- [ ] **S14** Implementar middleware de audit logging para acciones sensibles (create/update/delete de users, courses, enrollments)

### @backend — Permisos y validación

- [ ] **S2** Agregar permission `IsInstructorOwnerOrAdmin` a `CourseStudentsView` en `progress/views.py:145`
- [ ] **S8** Usar `select_for_update()` en `SecureLoginView` para operación atómica de lockout
- [ ] **S9** Agregar validación de ownership en `ModuleCreateView` y `LessonCreateView` (`perform_create` verifica que el curso pertenece al instructor)
- [ ] **S10** Agregar whitelist de tipos de archivo para materiales (PDF, DOCX, XLSX, PPTX, MP4, ZIP)
- [ ] **S11** Instalar `bleach` y sanitizar HTML en serializers de lessons, blog, y Q&A

### @frontend — Tokens y XSS

- [ ] **S12** Migrar refresh token de sessionStorage a HttpOnly cookie (requiere cambio coordinado con @backend para set-cookie en login/refresh)
- [ ] **S13** Implementar mutex/Promise lock para token refresh race condition en `api.js`

### @devops — Variables de entorno

- [ ] Verificar que producción en Railway tiene `SECRET_KEY`, `DEBUG=False`, CORS con dominios exactos
- [ ] Crear checklist de env vars requeridas en README o script de validación

**Criterio de completado:** Zero issues críticos/altos de seguridad. Revisión cruzada entre @security y @backend.

---

## FASE 1: INTEGRACIÓN DE STRIPE (Core del sistema de pagos)

> **Objetivo:** Reemplazar el sistema simulado con Stripe real, cumpliendo PCI-DSS.
> **Duración estimada:** 2 sprints

### Sprint 1.1 — Backend Stripe

#### @backend — Modelos y migraciones

- [ ] Instalar `stripe` en `requirements.txt`
- [ ] Agregar campos a modelo `User`: `stripe_customer_id` (CharField, null, blank, unique)
- [ ] Reescribir modelo `Purchase` con campos nuevos:
  ```
  stripe_payment_intent_id (CharField, unique, null)
  stripe_charge_id (CharField, null)
  currency (CharField, default='mxn', max_length=3)
  stripe_status (CharField)  # requires_payment_method, requires_confirmation, succeeded, canceled
  receipt_url (URLField, null)
  refund_amount (DecimalField, default=0)
  refund_status (CharField: none/partial/full)
  metadata (JSONField, default=dict)
  created_at (DateTimeField, auto_now_add)
  completed_at (DateTimeField, null)
  ```
- [ ] Crear modelo `StripeWebhookEvent`:
  ```
  stripe_event_id (CharField, unique)
  event_type (CharField)
  payload (JSONField)
  processed (BooleanField, default=False)
  created_at (DateTimeField, auto_now_add)
  ```
- [ ] Crear migraciones y aplicar

#### @backend — Endpoints de pago

- [ ] `POST /api/payments/create-intent/` — Crea Stripe PaymentIntent, retorna `client_secret`
  - Valida curso existe y tiene precio > 0
  - Crea o recupera Stripe Customer para el user
  - Crea Purchase con status=PENDING
  - Idempotency key por user+course
- [ ] `POST /api/payments/webhook/` — Recibe webhooks de Stripe (CSRF exempt)
  - Verifica firma con `STRIPE_WEBHOOK_SECRET`
  - Maneja eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
  - En `succeeded`: marca Purchase como COMPLETED, crea Enrollment, guarda receipt_url
  - En `payment_failed`: marca Purchase como FAILED
  - En `charge.refunded`: actualiza refund_status
  - Idempotente (no procesa evento duplicado)
- [ ] `GET /api/payments/{purchase_id}/status/` — Consulta estado del pago
- [ ] `POST /api/admin/payments/{purchase_id}/refund/` — Admin refund (parcial o total)
- [ ] Deprecar `PurchaseView` actual (mantener temporalmente para backwards compat)

#### @security — Config Stripe

- [ ] Agregar a settings: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (todos desde env vars)
- [ ] Agregar rate limiting específico para endpoints de pago: `'payments': '10/minute'`
- [ ] Eximir webhook de CSRF pero verificar firma Stripe

### Sprint 1.2 — Frontend Stripe

#### @frontend — Stripe Elements

- [ ] Instalar `@stripe/stripe-js` y `@stripe/react-stripe-js`
- [ ] Crear `StripeProvider` wrapper con `loadStripe(publishableKey)`
- [ ] Reescribir `PaymentModal.jsx`:
  - Eliminar TODO el manejo de datos de tarjeta
  - Usar `CardElement` o `PaymentElement` de Stripe
  - Flujo: llamar API create-intent → recibir client_secret → confirmar con `stripe.confirmCardPayment()`
  - Manejar 3D Secure redirect
  - Mostrar estados: procesando, éxito, error, reintento
- [ ] Crear `paymentService.js`:
  - `createPaymentIntent(courseId)`
  - `getPaymentStatus(purchaseId)`
- [ ] Actualizar `CourseView.jsx` para usar nuevo flujo de compra
- [ ] Agregar pantalla de confirmación post-pago con receipt

#### @backend — Estandarizar moneda

- [ ] Agregar campo `currency` al modelo `Course` (default='MXN')
- [ ] Actualizar admin analytics para usar moneda del curso
- [ ] Asegurar que Stripe recibe amounts en centavos (MXN * 100)

#### @devops — Configuración

- [ ] Agregar env vars en Railway: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Configurar webhook URL en dashboard de Stripe: `https://backend.up.railway.app/api/payments/webhook/`
- [ ] Agregar `VITE_STRIPE_PUBLISHABLE_KEY` al frontend en Railway

#### @qa — Validación

- [ ] Test con tarjetas de prueba Stripe (4242..., 4000000000003220 para 3DS)
- [ ] Verificar que enrollment se otorga SOLO después de webhook succeeded
- [ ] Verificar idempotencia (doble click, recarga de página)
- [ ] Test refund parcial y total desde admin
- [ ] Verificar que cursos gratis siguen funcionando sin Stripe

**Criterio de completado:** Compra exitosa end-to-end con Stripe en modo test. Webhook procesando correctamente. Cero datos de tarjeta en el backend.

---

## FASE 2: CORRECCIÓN DE FUNCIONALIDAD CRÍTICA

> **Objetivo:** Corregir los bugs funcionales que afectan la experiencia del usuario.
> **Duración estimada:** 1 sprint

### @frontend — Error handling y estados

- [ ] **E2** Agregar manejo de errores real en todos los catch blocks vacíos:
  - `CourseView.jsx:39,90` → mostrar toast/alert con mensaje de error
  - `LessonView.jsx:68,90` → mostrar estado de error con botón de reintentar
  - `QuizView.jsx:26` → mostrar error y redirigir al curso
- [ ] **E1** Implementar resume de video para providers no-YouTube:
  - Guardar posición en `LessonView.jsx` para iframes via postMessage API (Bunny/Cloudflare soportan)
  - Pasar `start` parameter en URL del iframe
- [ ] **E6** Agregar countdown timer en `FinalEvaluationView.jsx`:
  - Calcular tiempo restante desde `available_until`
  - Auto-submit cuando expire
  - Warning visual en últimos 5 minutos
- [ ] **E3** Implementar invalidación de cache en `ProgressContext`:
  - TTL de 5 minutos en `courseProgressCache`
  - Refresh manual después de completar lección/quiz
  - Invalidar al cambiar de sección
- [ ] **E7** Persistir sección seleccionada en localStorage en `SectionContext.jsx`

### @backend — Lógica de progreso

- [ ] **E4** Agregar `max_attempts` (IntegerField, default=0=ilimitado) al modelo `Quiz`
- [ ] Validar intentos restantes antes de permitir nuevo intento en `QuizAttemptView`
- [ ] **E5** Agregar endpoint `GET /api/courses/{id}/completion-requirements/` que retorne:
  - Total lecciones y completadas
  - Quizzes requeridos y aprobados
  - Si tiene evaluación final y su estado
  - Porcentaje de completado

### @qa — Validación

- [ ] Verificar flujo completo: inscribir → lecciones → quizzes → evaluación → certificado
- [ ] Verificar resume de video en cada provider (YouTube, Bunny, Cloudflare)
- [ ] Verificar timer de evaluación final
- [ ] Verificar que errores se muestran correctamente al usuario

---

## FASE 3: MEJORAS DE PANELES ADMIN E INSTRUCTOR

> **Objetivo:** Escalar los paneles para manejar volúmenes reales de datos.
> **Duración estimada:** 2 sprints

### Sprint 3.1 — Paginación y performance

#### @backend — Endpoints paginados

- [ ] **A1** Verificar que `UserListView` usa paginación de DRF (ya debería por settings, confirmar)
- [ ] **I2** Crear endpoint dedicado `GET /api/instructor/students/` con paginación cursor-based y filtros (curso, progreso, fecha)
- [ ] **I1** Crear endpoint dedicado `GET /api/instructor/qna/` que retorne todas las preguntas de cursos del instructor con filtros (estado, curso, fecha) — eliminar el loop O(n²) del frontend
- [ ] Agregar paginación a evaluaciones del instructor

#### @frontend — Implementar paginación en UI

- [ ] **A1** Agregar paginación a `UserManagement.jsx` (botones prev/next + indicador de página)
- [ ] **A2** Agregar paginación a `CourseManagement.jsx`
- [ ] **I2** Refactorizar `StudentManagement.jsx` para usar endpoint paginado (eliminar hardcode de 50)
- [ ] **I1** Refactorizar `QnAPanel.jsx` para usar endpoint dedicado con filtros (respondidas/pendientes, por curso)
- [ ] **I5** Agregar paginación a `InstructorEvaluationsPanel.jsx`

### Sprint 3.2 — Funcionalidad admin/instructor

#### @backend — Nuevos endpoints

- [ ] **A3** Endpoint para que admin edite cursos: `PATCH /api/admin/courses/{id}/` (título, descripción, precio, status, instructor)
- [ ] **A5** Endpoints de exportación: `GET /api/admin/users/export/?format=csv`, `GET /api/admin/purchases/export/?format=csv`
- [ ] **I4** Agregar métricas de revenue al endpoint de instructor dashboard
- [ ] **I6** Agregar filtro de periodo (date range) a analytics de instructor

#### @frontend — UI mejorada

- [ ] **A3** Modal de edición de curso en `CourseManagement.jsx`
- [ ] **A5** Botones de exportar CSV en dashboards admin
- [ ] **A6** Filtro por instructor en lista de cursos admin
- [ ] **I3** Agregar filtros a QnA: respondidas/pendientes, por curso, ordenar por fecha
- [ ] **I4** Agregar tarjetas de revenue en `InstructorDashboard.jsx`
- [ ] **A8** Agregar diálogo de confirmación antes de desactivar usuarios

#### @qa — Validación

- [ ] Verificar paginación funciona en todas las listas (prev/next, primera/última página)
- [ ] Verificar exportación CSV abre correctamente en Excel
- [ ] Verificar filtros combinados (búsqueda + filtro + paginación)
- [ ] Verificar edición de curso desde admin no rompe datos existentes

---

## FASE 4: ROBUSTEZ Y UX

> **Objetivo:** Pulir la experiencia del usuario con mejores estados de carga, accesibilidad, y feedback.
> **Duración estimada:** 1 sprint

### @frontend — UX y estados

- [ ] **E8** Crear componente `SkeletonLoader` reutilizable y aplicar en:
  - Dashboard (cards de stats)
  - CoursesList (grid de cursos)
  - LessonView (contenido + Q&A)
  - Listas admin/instructor
- [ ] Agregar toasts/notificaciones para acciones exitosas (inscripción, compra, completar lección)
- [ ] Mejorar empty states con ilustraciones y CTAs claros
- [ ] Agregar confirmación "Revisar respuestas" antes de enviar quiz/evaluación

### @frontend — Accesibilidad (WCAG 2.1 AA)

- [ ] **E9** Agregar ARIA labels a componentes de quiz (MultipleChoice, TrueFalse, Matching, etc.)
- [ ] Agregar keyboard navigation al video player
- [ ] Agregar `alt` text a thumbnails de cursos
- [ ] Agregar skip-to-content link en `MainLayout.jsx`
- [ ] Asegurar contraste de colores en modo dark/light
- [ ] Agregar texto alternativo a indicadores de color (verde/rojo en quizzes)

### @backend — Cleanup

- [ ] Crear management command `cleanup_expired_tokens` para limpiar tokens expirados
- [ ] Crear management command `cleanup_expired_memberships` para marcar membresías expiradas
- [ ] Agregar `ordering` default a todos los modelos que no lo tienen

### @qa — Testing integral

- [ ] Test de flujo completo en modo light y dark
- [ ] Test de responsive en mobile (375px), tablet (768px), desktop (1440px)
- [ ] Test con screen reader (NVDA o VoiceOver)
- [ ] Test de performance: página de cursos con 100+ cursos, lista de usuarios con 500+ usuarios

---

## FASE 5: ANALYTICS AVANZADOS Y REPORTES

> **Objetivo:** Dar visibilidad real a admin e instructores sobre métricas de negocio.
> **Duración estimada:** 1 sprint

### @backend — Endpoints de analytics

- [ ] Endpoint de revenue con filtro de rango de fechas personalizado
- [ ] Endpoint de tendencias (comparativa mes actual vs anterior)
- [ ] Endpoint de analytics por instructor (revenue generado, cursos, alumnos activos)
- [ ] Endpoint de métricas de engagement (tiempo promedio en lección, completion rate por módulo)
- [ ] Endpoint de dropout analysis (en qué lección abandonan los alumnos)

### @frontend — Dashboards mejorados

- [ ] **A7** Agregar date range picker al admin dashboard
- [ ] Gráficas de tendencia comparativa (mes actual vs anterior)
- [ ] Tabla de instructores con métricas (admin)
- [ ] **I6** Gráficas de tendencia temporal para instructor (completion rate over time)
- [ ] Dashboard de dropout por curso (instructor)

---

## FASE 6: FEATURES DE PAGO AVANZADOS

> **Objetivo:** Completar el ecosistema de pagos con cupones, suscripciones y facturación.
> **Duración estimada:** 2 sprints

### @backend

- [ ] Modelo `Coupon` (código, descuento %, descuento fijo, usos máximos, fecha expiración, cursos aplicables)
- [ ] Endpoint para validar y aplicar cupón al crear PaymentIntent
- [ ] Modelo `Invoice` con generación de PDF (ReportLab)
- [ ] Endpoint de historial de pagos del alumno: `GET /api/payments/history/`
- [ ] Soporte para suscripciones por sección (Stripe Subscriptions) si se requiere cobro recurrente
- [ ] Endpoint de refund con razón y notificación por email al alumno

### @frontend

- [ ] Campo de cupón en `PaymentModal` con validación en tiempo real
- [ ] Página "Mi historial de pagos" con lista de compras y receipts
- [ ] Descarga de factura/recibo PDF desde historial
- [ ] Vista de refund status (pendiente, procesado, rechazado)
- [ ] Admin: panel de cupones (crear, editar, desactivar, ver uso)

---

## RESUMEN DE FASES

| Fase | Nombre | Duración | Agentes principales | Dependencias |
|------|--------|----------|---------------------|--------------|
| **0** | Seguridad Crítica | 1 sprint | @security, @backend, @frontend, @devops | Ninguna — HACER PRIMERO |
| **1** | Integración Stripe | 2 sprints | @backend, @frontend, @security, @devops, @qa | Fase 0 |
| **2** | Corrección Funcional | 1 sprint | @frontend, @backend, @qa | Fase 0 |
| **3** | Mejoras de Paneles | 2 sprints | @backend, @frontend, @qa | Fase 0 |
| **4** | Robustez y UX | 1 sprint | @frontend, @backend, @qa | Fases 2 y 3 |
| **5** | Analytics Avanzados | 1 sprint | @backend, @frontend | Fase 3 |
| **6** | Pagos Avanzados | 2 sprints | @backend, @frontend | Fase 1 |

> **Nota:** Las fases 2 y 3 pueden ejecutarse en paralelo con la Fase 1, ya que no dependen de Stripe. La Fase 4 requiere que 2 y 3 estén completas. Las fases 5 y 6 son independientes entre sí.

```
Fase 0 ──┬── Fase 1 ──────────── Fase 6
          │
          ├── Fase 2 ──┐
          │             ├── Fase 4
          └── Fase 3 ──┘
                │
                └── Fase 5
```

---

## WORKFLOW DE AGENTES POR TAREA

Para cada tarea del plan, el flujo es:

1. **@backend** o **@frontend** (según corresponda) implementa el cambio
2. **@security** revisa si la tarea toca autenticación, permisos, o datos sensibles
3. **@qa** valida el flujo end-to-end
4. **@devops** actualiza env vars o configuración si es necesario

### Reglas de coordinación

- @backend y @frontend pueden trabajar en paralelo si la tarea no requiere API nueva
- Si @backend crea endpoint nuevo, @frontend espera a que esté mergeado para integrarlo
- @security revisa TODOS los PRs de Fase 0 y Fase 1 antes de merge
- @qa hace smoke test al final de cada sprint antes de deploy
