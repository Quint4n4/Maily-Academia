# Asignar Academia a Instructor desde Panel Admin

**Fecha:** 2026-03-05  
**Tipo:** feature  
**Área:** ambos  
**Subagente(s):** backend-maily, frontend-dev  

## Descripción

Se agregó la opción de asignar una academia (Maily Academia, Longevity 360, Corporativo) a un instructor al crearlo o editarlo desde el panel de administrador. El administrador puede indicar en qué academia podrá publicar cursos cada profesor. La asignación se persiste como un `SectionMembership` con `role=instructor`, reutilizando la infraestructura existente de secciones.

Adicionalmente, se implementó la auto-asignación automática de sección al crear un curso: cuando un instructor crea un nuevo curso, el backend le asigna automáticamente la academia donde tiene membresía activa, sin que el instructor tenga que seleccionarla manualmente.

## Archivos modificados

### Backend
- `backend/apps/users/serializers.py` — `InstructorCreateSerializer`: campo `section_slug` opcional; crea `SectionMembership` al crear instructor. `AdminUserSerializer`: campo `instructor_section` (read) que expone la sección activa del instructor; campo `section_slug` (write) con lógica de upsert en `update()`. `MeSerializer`: campo `instructor_section` (read) con `{id, slug, name}` para que el instructor conozca su academia desde `/api/auth/me/`.
- `backend/apps/courses/views.py` — `CourseListCreateView.perform_create()`: si el instructor no especifica sección, se auto-asigna su membresía activa de instructor.
- `backend/apps/courses/serializers.py` — `CourseListSerializer`: campos `section_slug` y `section_name` agregados para exponer la academia de cada curso en el listado.

### Frontend
- `cursos-maily/src/services/userService.js` — Método `getSections()`. Métodos `createInstructor()` y `update()` actualizados para pasar `section_slug`.
- `cursos-maily/src/pages/admin/UserManagement.jsx` — Selector de academia en modales crear/editar. Tabla muestra academia del instructor.
- `cursos-maily/src/context/AuthContext.jsx` — `fetchUser()` almacena `instructorSection` desde la respuesta de `/api/auth/me/`.
- `cursos-maily/src/pages/instructor/MyCourses.jsx` — Banner de academia asignada (o advertencia si no tiene). Badge de academia en cada tarjeta de curso.

## Checklist

- [x] `InstructorCreateSerializer` acepta `section_slug` y valida que exista la sección
- [x] Al crear instructor con sección, se crea `SectionMembership(role=instructor)`
- [x] `AdminUserSerializer` expone `instructor_section` en respuestas GET/PATCH
- [x] `AdminUserSerializer.update()` hace upsert de membresía al recibir `section_slug`
- [x] Si `section_slug` es string vacío, desactiva las membresías instructor previas
- [x] `MeSerializer` expone `instructor_section` con `{id, slug, name}`
- [x] `CourseListCreateView.perform_create()` auto-asigna la sección del instructor al crear un curso
- [x] `CourseListSerializer` expone `section_slug` y `section_name`
- [x] `AuthContext.fetchUser()` guarda `instructorSection` en el estado del usuario
- [x] `MyCourses.jsx` muestra banner con nombre de academia (o aviso si no tiene)
- [x] Tarjetas de curso muestran badge de academia en la esquina inferior derecha
- [x] `userService.getSections()` llama a `GET /api/sections/`
- [x] Modal crear profesor muestra selector de academia
- [x] Modal editar usuario muestra selector de academia (solo si rol es instructor)
- [x] La tabla de usuarios muestra el nombre de la academia bajo el badge de rol
- [x] Sin errores de lint en archivos modificados

## Notas técnicas

- No se requirió migración de base de datos. Se reutilizó `SectionMembership` que ya existía con `unique_together = ('user', 'section')`.
- El campo `section_slug` en `AdminUserSerializer` es `write_only` y no aparece en respuestas GET.
- El campo `instructor_section` es `read_only` (SerializerMethodField) y solo retorna datos para usuarios con `role=instructor`.
- La lógica de upsert en `_assign_section()` desactiva membresías de otras secciones antes de activar la nueva, garantizando que un instructor tenga como máximo una academia activa.
- Las secciones se cargan desde `GET /api/sections/` (endpoint público existente), sin cambios en el backend de secciones.
