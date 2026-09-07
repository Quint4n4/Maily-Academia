# Gestión de acceso de estudiantes a academias desde el panel admin

**Fecha:** 2026-03-05  
**Tipo:** feature  
**Área:** ambos (backend + frontend)  
**Subagente(s):** backend-maily + frontend-dev

## Descripción

El administrador ahora puede crear cuentas de estudiantes directamente desde el panel admin y asignarles acceso a Maily Academia y/o Corporativo CAMSA (academias de acceso restringido por invitación).

Longevity 360 es pública y está disponible automáticamente para todos los estudiantes registrados. Las demás academias requieren que el administrador otorgue acceso explícitamente.

Además, el admin puede gestionar el acceso de estudiantes ya registrados mediante un modal dedicado que permite dar o revocar acceso a cada academia privada.

## Archivos modificados

### Backend
- `backend/apps/users/serializers.py` — Nuevo `AdminStudentCreateSerializer` (crear estudiante + asignar secciones). Campo `student_sections` añadido a `AdminUserSerializer` para mostrar a qué academias privadas pertenece cada estudiante
- `backend/apps/users/views.py` — Nueva vista `StudentCreateView` (`POST /api/users/students/`)
- `backend/apps/users/urls_admin.py` — Registrado `students/` → `StudentCreateView`

### Frontend
- `cursos-maily/src/services/userService.js` — Método `createStudent(data)`
- `cursos-maily/src/services/adminService.js` — Métodos `getSectionMembers`, `addStudentToSection`, `removeStudentFromSection`
- `cursos-maily/src/pages/admin/UserManagement.jsx` — Rediseño: pestañas Todos/Estudiantes/Profesores, botón "Crear Estudiante", modal de creación de estudiante con checkboxes de academia, badge de academias en filas de estudiantes, botón de icono para abrir modal de gestión de acceso por estudiante

## Checklist

- [x] `POST /api/users/students/` crea cuenta y asigna secciones en una sola llamada
- [x] `AdminUserSerializer` devuelve `student_sections` (lista de academias activas del estudiante)
- [x] Corporativo CAMSA solo visible en UI para super-admins (`isSuperAdmin`)
- [x] El backend ya protege Corporativo con `IsSuperAdmin` en `SectionMembersListCreateView`
- [x] Modal "Gestionar acceso" permite dar/revocar acceso a academias privadas en tiempo real
- [x] Tabla muestra badges de academias asignadas a cada estudiante
- [x] Longevity 360 siempre aparece como "acceso automático" (no se gestiona, es pública)
- [x] Pestañas Todos / Estudiantes / Profesores para filtrar la tabla
- [x] No hay migración de base de datos necesaria (modelo `SectionMembership` ya existe)

## Pendientes / TODOs

- [ ] Considerar agregar paginación a la tabla cuando el número de usuarios sea grande
- [ ] Notificación por email al estudiante cuando se le otorga/revoca acceso (feature futura)

## Notas técnicas

- `AdminStudentCreateSerializer.validate_phone` verifica unicidad de teléfono igual que `RegisterSerializer`
- El username se genera automáticamente con `generate_unique_username(first_name, last_name)`
- Para agregar/quitar acceso a secciones se reutilizan los endpoints ya existentes: `POST/DELETE /api/admin/sections/<slug>/members/`
- Corporativo CAMSA (`section_type='corporate'`) requiere `IsSuperAdmin` en el backend. El frontend oculta esta opción si `user.is_super_admin` es `false`
- La propiedad `student_sections` en `AdminUserSerializer` filtra solo membresías activas con `role='student'` y secciones activas
