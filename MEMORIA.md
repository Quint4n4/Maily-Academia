# MEMORIA

> Bitácora del repo: qué pasó, cuándo y qué quedó abierto. Una entrada por sesión de trabajo.
> Lo que el cliente podría leer va en Notion; esto es para quien tenga el código enfrente.

---

## 2026-09-02 · Adopción de la biblioteca de skills

**Este repo adoptó la biblioteca** (`biblioteca-de-skills@biblioteca-emanuel`).
`proyecto.fecha_adopcion: 2026-09-02`.

- Se creó `.claude/PERFIL-DEL-REPO.md`. **Seis claves quedaron `[propuesto]`** y están listadas al
  final de ese archivo con lo que apaga cada una. Hasta confirmarlas, las skills las tratan como
  huecos.
- `.cursor/agents/` se archivó en `.claude/_archivo/agentes-cursor/`. Ya había divergido del repo.
- Línea base en `docs/00-deuda.md`: **1 P0, 6 P1, 4 P2**.

**No se tocó ninguna skill del plugin en esta sesión.** Sí salió material para el camino de subida:
`aislamiento-de-datos` supone que el ámbito es un campo en los modelos, y aquí solo 2 de 36 modelos
lo tienen — los otros 34 derivan el ámbito recorriendo relaciones hasta `Course`. Ese caso no está
cubierto por la skill. Anotado en el perfil, §2.

### Lo urgente que salió

**P0 — el catálogo público expone academias con credenciales requeridas.** `GET /api/courses/` y
`/api/courses/{id}/` tienen `AllowAny` y solo filtran por `status`. Un anónimo obtiene módulos,
lecciones y URLs de video de Corporativo CAMSA. **Confirmado también en producción.** Sin arreglar.

## 2026-09-02 · Los alumnos no veían los cursos nuevos

Rama `fix/student-course-visibility`, **sin fusionar**.

Dos fallas encadenadas: los `.annotate()` descartaban el `Meta.ordering` y el SQL salía sin
`ORDER BY`, así que el curso más nuevo caía al final; y el catálogo del alumno no paginaba, con lo
que los cursos 21 en adelante eran invisibles para todos.

De ahí salió una regla que vale para cualquier repo: **todo queryset paginado lleva `.order_by()`
explícito**, aunque el modelo declare `Meta.ordering`. Candidata a subir a `django-backend`.

## 2026-09-02 · El repo entró en git

Antes no tenía historia. La contraseña de Postgres estaba escrita en `docker-compose.yml`; se sacó
a una variable **antes** del primer commit, así que no quedó en el historial. **Rotarla igual** si
se usa en otro sitio.

Puertos locales: backend `8020`, Postgres `5435`. Los 8000 y 5432 los ocupa MailySoft.
