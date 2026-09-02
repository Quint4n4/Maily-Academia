# Archivo

## `agentes-cursor/` — archivado el 2026-09-02

Cuatro agentes de Cursor (`backend-maily`, `frontend-dev`, `orquestador`,
`implementador-plan-academia`) que describían el proyecto para agentes de IA.

**Por qué se archivaron y no se borraron:** describían el mismo repo que ahora
describe `.claude/PERFIL-DEL-REPO.md`. Dos definiciones del mismo hecho divergen,
y estas ya habían divergido:

- `frontend-dev.md:206` decía que el backend corre en `localhost:8000`. Desde el
  2026-09-02 corre en `8020` — ese puerto lo ocupa otro proyecto.
- `backend-maily.md:56` repetía `PAGE_SIZE = 20`, que ahora vive en el perfil.

**Qué se cosechó antes de archivar:** los hechos locales (stack, roles, secciones,
forma de las vistas) se mudaron al perfil. No había ninguna regla universal que la
biblioteca no tuviera ya, así que nada subió al plugin.

Si alguien vuelve a usar Cursor en este repo, que lea el perfil y regenere lo que
necesite desde ahí. No revivir estos archivos: su contenido es de marzo.
