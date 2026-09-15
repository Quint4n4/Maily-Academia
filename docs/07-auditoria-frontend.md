# Auditoría de interfaz y accesibilidad

> Modo auditoría: **no bloquea nada**. Es la línea base estética, equivalente a `docs/00-deuda.md`
> para el backend.
>
> Repo: `Maily-Academia` · Fecha: `2026-09-03` · Rama auditada: `chore/adoptar-biblioteca`
> (= el frontend que está en producción) · Entorno: local, Chrome, temas claro y oscuro,
> viewport 1280 y 375

---

## Método

Cada punto se **midió**, no se opinó. Contraste calculado con la fórmula de luminancia relativa de
WCAG 2.1 sobre el color computado del texto y el primer fondo sólido de sus ancestros. Umbrales:
**4.5:1** texto normal, **3:1** texto grande (≥24px, o ≥18.66px en negrita). Áreas táctiles contra
**24×24 px**, que es el mínimo de WCAG 2.2 AA (2.5.8).

Pantallas recorridas: login, dashboard del alumno, catálogo de academia, catálogo general, mis
cursos, certificados, ficha de curso, vista de lección, y el constructor de cursos del instructor.

### Dos falsos positivos que se descartaron

Van escritos porque **la skill que salga de aquí tiene que evitarlos**:

1. **Texto sobre gradiente o imagen.** "Conoce Maily Academia" salió con ratio 1.05 (blanco sobre
   blanco). Era falso: el bloque tiene `linear-gradient(rgb(10,22,40) …)` y el texto blanco encima
   se lee perfecto. Un medidor que solo mira `background-color` miente. **Regla: si algún ancestro
   tiene `background-image`, el contraste no es medible automáticamente — se marca y se revisa a
   ojo.**
2. **Medir durante la animación de entrada.** Un enlace de tarjeta salió con `width: 2px` y su grid
   con `width: 0`. Era falso: medido con el layout estable, el grid tiene 719px y dos columnas de
   347px. La clase `animate-fade-in` estaba corriendo. **Regla: esperar a que terminen las
   animaciones antes de medir geometría.**

---

## Resumen

| Severidad | Cuántos |
|---|---|
| **P1** | 4 |
| **P2** | 5 |
| **P3** | 3 |

Ningún P0: nada impide usar la aplicación. Lo que hay es una plataforma que **excluye a parte de
sus usuarios** y que en tema oscuro tiene texto que no se lee.

---

## P1

### F1 · Texto negro sobre fondo oscuro en el constructor de cursos

**Ratio 1.43:1** — se exige 4.5. Prácticamente invisible.

| Texto | Color | Fondo | Ratio |
|---|---|---|---|
| "Material de apoyo" | `rgb(0,0,0)` | `rgb(31,41,55)` | **1.43** |
| "PDFs, presentaciones, documentos" | `rgb(0,0,0)` | `rgb(31,41,55)` | **1.43** |

**Dónde:** `cursos-maily/src/pages/instructor/CourseBuilder.jsx`, panel lateral izquierdo.
**Causa:** falta la variante `dark:` en el color del texto. En tema claro se ve bien.
**Cómo se comprueba:** abrir el constructor en tema oscuro y leer el panel izquierdo.
**Por qué es P1:** es la pantalla donde el instructor pasa la mayor parte de su tiempo.

### F1b · El mismo fallo está en el panel del instructor

Encontrado el 2026-09-03 al probar `verificador.js` de la skill `revision-de-interfaz`, en una
pantalla que la pasada manual no había recorrido.

`/instructor/dashboard` en tema oscuro: **12 fallos de contraste**, el peor con el mismo patrón que
F1 — `rgb(0,0,0)` sobre `rgb(31,41,55)`, **ratio 1.43**, en los títulos de curso a 11px.

El verificador calcula la corrección: ese mismo texto **en blanco daría 14.68**.

Que una herramienta encontrara en una pantalla lo que una pasada a ojo no vio en otra es el
argumento para que la revisión de interfaz se corra siempre con el verificador, no a criterio.

### F2 · El texto sobre el dorado de marca no alcanza el mínimo

**Ratio 3.25:1** en `rgb(0,0,0)` sobre `rgb(132,84,0)`. Aparece en al menos tres sitios:
"Entrar al Curso", "Suscribirse" y el bloque de partners del catálogo.

**Es la paleta de marca, no un descuido puntual.** Y la corrección está medida:

| Combinación | Ratio | Veredicto |
|---|---|---|
| Negro sobre `#845400` (hoy) | 3.25 | Falla |
| **Blanco sobre `#845400`** | **6.46** | **Pasa con holgura** |

**Un cambio de color de texto arregla los tres sitios a la vez.**

### F3 · Campos de formulario sin etiqueta asociada

Un lector de pantalla anuncia "cuadro de edición" sin decir de qué.

| Pantalla | Campos sin `<label for>` ni `aria-label` |
|---|---|
| Login | 2 — correo y contraseña (solo tienen `placeholder`) |
| Constructor de cursos | 5 — título, descripción, nivel, duración, precio |
| Catálogo general | 2 — búsqueda y orden |

**El `placeholder` no es una etiqueta:** desaparece al escribir, y muchos lectores de pantalla no lo
anuncian. Incumple WCAG 3.3.2 y 4.1.2.
**Cómo se comprueba:**
`document.querySelectorAll('input:not([type=hidden]),select,textarea')` y para cada uno verificar
que exista `label[for=id]`, `aria-label` o `aria-labelledby`.

### F4 · Botones de solo icono sin nombre accesible

**6 botones** en el constructor de cursos y **2** en el navbar móvil (menú y cambio de tema) no
tienen texto, ni `aria-label`, ni `title`. Se anuncian como "botón", sin más.

Ejemplos: `p-0.5 rounded hover:bg-gray-200 …`, `p-1 text-gray-400 hover:text-red-5…` (el de borrar).
**Un botón de borrar que se anuncia solo como "botón" es un accidente esperando.**

---

## P2

### F5 · Áreas táctiles por debajo del mínimo

WCAG 2.2 AA (2.5.8) pide 24×24 px. Encontrados:

| Dónde | Elemento | Tamaño |
|---|---|---|
| Constructor de cursos | botones de reordenar e icono | **14×14**, 16×16, 22×22 |
| Login | mostrar/ocultar contraseña | 20×30 |
| Catálogo general | casillas de filtro | 20×20 |
| Dashboard | "Ver todos" | 112×**20** |
| Vista de lección | "Volver al curso" | 161×**20** |

Los de 14×14 del constructor son los peores, y son de reordenar módulos y lecciones: acciones que se
repiten muchas veces seguidas.

### F6 · El enlace "Saltar al contenido principal" no funciona

Existe en todas las pantallas —alguien pensó en accesibilidad— pero mide **32×16 px y no cambia de
tamaño al recibir el foco**. Medido: antes del foco 32×16, con foco 32×16.

Un skip link debe hacerse visible y usable al enfocarse. Este es inalcanzable en la práctica.

### F7 · El aviso de "vista previa" no se lee bien

"Vista previa — Inscríbete para acceder al contenido completo": `rgb(217,119,6)` sobre
`rgb(251,249,244)` = **3.03:1**.

Es el mensaje que le dice al alumno que tiene que inscribirse. **Es el que convierte.**

### F8 · Insignias de nivel y precio por debajo del mínimo

| Elemento | Colores | Ratio | Corrección medida |
|---|---|---|---|
| Insignia "Principiante" | blanco sobre `#059669`, 10px | **3.77** | Negro sobre el mismo verde: **5.57** |
| "GRATIS" | `#16a34a` sobre blanco | **3.30** | `#15803d` (green-700): **5.02** |

Además, 10px es demasiado pequeño para una insignia.

### F9 · `<img src="">` en bucle

La consola escupe decenas de advertencias de React:

> An empty string ("") was passed to the src attribute. This may cause the browser to download the
> whole page again over the network.

**Causa:** `Course.thumbnail` tiene `default=''` y el componente lo pasa directo a `<img src>`.
**Cómo se comprueba:** abrir la consola en cualquier listado de cursos.
**Efecto:** peticiones de red inútiles, y un hueco donde debería haber una imagen o un marcador.

---

## P3

### F10 · Ninguna página del alumno tiene `<h1>`

`dashboard`, `my-courses` y el catálogo de academia salen con **cero `<h1>`**. El catálogo general,
la ficha de curso y la lección sí tienen uno.

Sin `<h1>` un lector de pantalla no puede decir de qué trata la página.

### F11 · Saltos en la jerarquía de encabezados

`h1 → h3` en certificados y en la vista de lección. Se salta `h2`.

### F12 · Los thumbnails no tienen relación de aspecto fija

Reportado desde las capturas del 28 de agosto: las imágenes de curso salen con bandas negras a los
lados. No hay recorte ni `aspect-ratio`. **`ImageCropModal.jsx` existe en el repo y no se usa en el
flujo de creación de curso.**

---

## Lo que está bien y conviene no romper

Una auditoría que solo lista defectos hace que se ignore lo que ya funciona:

| Qué | Evidencia |
|---|---|
| **El responsive funciona.** Ninguna pantalla desborda horizontalmente en 375px | `scrollWidth` = 375 en catálogo, lección y dashboard |
| Los filtros de nivel usan scroll horizontal propio en móvil, en vez de romper el ancho | Contenedor con `flex-shrink-0` |
| El tema oscuro está implementado en casi toda la aplicación | Solo el constructor tiene texto sin variante `dark:` |
| Ninguna imagen carece de atributo `alt` | 0 en todas las pantallas |
| Existe un skip link, aunque no funcione | Alguien pensó en accesibilidad; falta terminarlo |
| `my-courses` y `certificados` no tienen ni un fallo de contraste | Se pueden usar de referencia |

---

## Qué de esto se convierte en skill

Los puntos que valen para cualquier proyecto —contraste medido, etiquetas de formulario, nombre
accesible de botones de icono, área táctil, skip link, `<h1>`, jerarquía de encabezados— son
material para la skill de revisión estética.

Los que son de este repo —el dorado `#845400`, el verde `#059669`, `ImageCropModal` sin usar— se
quedan aquí.

Y las dos reglas de método del principio (gradientes no medibles, esperar a las animaciones) van a
la skill, porque son las que evitan que devuelva hallazgos falsos.
