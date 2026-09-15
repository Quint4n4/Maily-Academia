# Lista de despliegue

> Aquí viven los puntos que **ninguna skill puede contestar leyendo el repo**. No están aquí porque
> sean menos importantes: están aquí porque el repo no cambia si fallan, y dejarlos en un checklist
> de código los condena a contestarse con un `PASA` de memoria.
>
> Repo: `Maily-Academia` · Última revisión completa: `nunca`

---

## Primer despliegue: HECHO el 2026-09-15

Desplegado y verificado. Lo que se aprendió, para el siguiente:

- **El despliegue lo dispara `git push` a `main` de `Quint4n4/Maily-Academia`**, no
  `railway up`. Los dos servicios se despliegan a la vez: no hay forma de hacer primero el
  backend y comprobar, como decía la guía de abajo. Quedó un rato con frontend nuevo y
  backend viejo, y funcionó por cómo están escritos los degradados, no por diseño.
- **La migración corre sola**: `start.sh` ejecuta `migrate --noinput` al arrancar.
- **El healthcheck no debe depender de una redirección.** Ver la entrada del 2026-09-15 en
  `MEMORIA.md`.
- **`gh` tiene dos cuentas.** La que puede escribir en el repo es `Quint4n4`.

### Pendientes tras este despliegue

| # | Qué | Estado |
|---|---|---|
| — | `SENTRY_DSN` en Railway | **abierto** — sentry.io estaba caído el día del despliegue |
| — | Un evento real de Sentry llega sin datos personales | abierto, depende del anterior |
| — | Cuenta de Bunny Stream y sus dos variables | abierto, antes de subir videos reales |
| — | `SECURE_SSL_REDIRECT` activado correctamente | abierto. Railway ya fuerza HTTPS en su proxy, así que no es urgente; si se activa, hay que excluir la ruta del healthcheck |

---

## Guía original (preparada antes del despliegue)

`main` quedó listo: **29 commits, 55 tests en verde, frontend compilando**. Producción sigue con el
código del 1 de septiembre, así que este despliegue lleva siete sesiones de cambios juntas.

### Antes de tocar Railway

**1 · Comprueba la `SECRET_KEY` de producción.** La del `.env` local mide 44 caracteres y empieza
por `django-insecure`, que es la que Django genera sola. Si la de Railway es esa misma, cámbiala
antes de desplegar: esa clave firma los tokens de sesión y los JWT.

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Ojo: **al cambiarla se invalidan todas las sesiones activas.** Todo el mundo tendrá que volver a
entrar. Hazlo a una hora en que eso no moleste.

**2 · Ten a mano la vuelta atrás.** Antes de desplegar, anota en qué commit está Railway ahora.

### El orden, y por qué es ese

| # | Paso | Por qué aquí |
|---|---|---|
| 1 | `SENTRY_DSN` en Railway | Primero, para que si algo del despliegue falla te enteres por Sentry y no por un usuario |
| 2 | Desplegar **solo el backend** | Si algo sale mal, sabes en qué mitad está |
| 3 | Correr la migración `users/0009_registro_de_auditoria` | La bitácora no funciona sin su tabla. Es un `CreateModel`, reversible, sin datos que migrar |
| 4 | **Activar `allow_public_preview` en Longevity 360** | Admin de producción. Ver la advertencia de abajo |
| 5 | Comprobar el backend (abajo) | Antes de tocar el frontend |
| 6 | Desplegar el frontend | |
| 7 | Comprobar la interfaz | |

### La advertencia que importa

> **Si despliegas y olvidas el paso 4, el catálogo de Longevity 360 deja de verse sin iniciar
> sesión.** Va a parecer que el despliegue rompió la vitrina, y lo único que falta es una casilla
> en el admin.

Hasta ahora el `post_migrate` forzaba esa bandera en cada despliegue; eso se corrigió, así que desde
este despliegue el valor que pongas en el admin **se queda**.

### Qué comprobar tras el paso 2

```bash
B=https://maily-academia-production-de9b.up.railway.app

# 1 · La fuga entre academias, cerrada: NO debe salir Corporativo CAMSA
curl -s "$B/api/courses/?page=2" | grep -o '"section_name":"[^"]*"' | sort -u

# 2 · El logout existe: debe dar 401 (falta autenticación), ya no 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$B/api/auth/logout/" \
  -H "Content-Type: application/json" -d '{}'

# 3 · La ficha pública de un curso NO debe traer ninguna URL de video
curl -s "$B/api/courses/30/" | grep -c video_url    # esperado: 0
```

Si el 1 sigue mostrando Corporativo CAMSA, el despliegue no tomó: revisa que Railway esté
construyendo desde el commit correcto.

### Qué comprobar tras el paso 6

- Entrar como alumno y ver el catálogo: los cursos más nuevos deben salir **primero**, y debe haber
  paginación al final de la lista.
- Cerrar sesión y comprobar que no puedes volver atrás con el botón del navegador.
- Abrir el constructor de cursos en **tema oscuro**: el panel izquierdo debe leerse.

### Lo que NO entra en este despliegue

Bunny Stream. El código está listo pero desactivado: sin `BUNNY_STREAM_LIBRARY_ID` y
`BUNNY_STREAM_TOKEN_KEY` todo sigue funcionando con YouTube exactamente como hoy. Se activa cuando
crees la cuenta.

---

## Cómo se usa

1. Toda revisión que produzca un `NO VERIFICABLE` **añade el punto aquí** si no está ya. Ese es el
   único destino legítimo; un `NO VERIFICABLE` que no llega a esta lista desaparece.
2. Se recorre entera **antes de un despliegue que cambie infraestructura, esquema o autenticación**.
   No hace falta en un despliegue de una pantalla.
3. Cada punto se cierra con **evidencia y fecha**. "Sí, está" no cierra nada. La fecha es lo que
   distingue un backup que se restauró de uno que se restauró hace catorce meses.
4. Un punto que lleva más de seis meses sin comprobarse **vuelve a estar abierto**, aunque su última
   comprobación dijera que sí.
5. **Todo punto de esta lista tiene una skill que lo manda aquí.** Está en la tabla "Lo que salió de
   esta lista" o en la sección "Lo que esta skill no puede verificar" de la skill correspondiente.
   Si agregas uno sin origen, ninguna revisión lo va a volver a levantar: anótalo abajo como *punto
   sin skill de origen* para que se sepa.

---

## 1 · Entorno de ejecución

| # | Punto | Cómo se comprueba | Evidencia que lo cierra | Última | Estado |
|---|---|---|---|---|---|
| D1 | El modo de depuración está apagado en producción | Provocar un 404 en el dominio real y leer la respuesta | Captura de la página de error sin traza | | |
| D2 | Los hosts permitidos están acotados | Petición con una cabecera `Host` ajena | Responde 400, no 200 | | |
| D3 | Ninguna variable de entorno de producción tiene un valor de desarrollo | Listar las variables del entorno real y compararlas con el `.env.example` | Lista revisada, con fecha | | |
| D4 | La zona horaria del servidor es la esperada | Crear un registro y comparar su marca de tiempo con la hora local del negocio | Registro y hora contrastados | | |

**D1 no se puede comprobar desde el repo** porque el valor efectivo es una variable del hosting. El
repo solo puede garantizar que el valor por defecto sea el seguro.

---

## 2 · Transporte y sesión

| # | Punto | Cómo se comprueba | Evidencia que lo cierra | Última | Estado |
|---|---|---|---|---|---|
| D5 | El sitio no responde por HTTP sin cifrar | Petición a `http://` del dominio real | Redirige a `https://` | | |
| D6 | El navegador recuerda que debe usar HTTPS | Leer la cabecera de seguridad de transporte en la respuesta | Cabecera presente con su duración | | |
| D7 | La cookie de sesión solo viaja cifrada | Leer `Set-Cookie` en el dominio real | Lleva la marca de solo-cifrado | | |
| D8 | Solo los orígenes previstos obtienen respuesta | Petición desde un origen ajeno contra la API real | Sin cabecera de permiso | | |

D7 es la mitad de un punto que sí vive en `security-checklist`: la parte que se puede comprobar sin
HTTPS —que la cookie no sea legible por JavaScript y que declare su alcance— se queda allá.

---

## 3 · Datos

| # | Punto | Cómo se comprueba | Evidencia que lo cierra | Última | Estado |
|---|---|---|---|---|---|
| D9 | **Existe un backup y se restauró de verdad** | Restaurar el último backup en un entorno aparte y abrir la aplicación contra él | Fecha de la restauración y qué se verificó dentro | | |
| D10 | La restauración conserva las reglas de aislamiento, no solo las tablas | Sobre el entorno restaurado de D9, correr el test de fuga | El test pasa contra la copia | | |
| D11 | El rol de base de datos de la aplicación no es superusuario | Consultar el rol con el que se conecta la aplicación en producción | Nombre del rol y sus atributos | | |
| D12 | Hay backup inmediatamente antes de cada migración, y se sabe volver | Antes de migrar: tomar el backup y anotar la revisión anterior | Identificador del backup y de la revisión | | |
| D13 | La migración se puede deshacer | Migrar hacia atrás en el entorno de D9 | Salida del comando | | |
| D14 | Una columna obligatoria nueva no rompe con datos reales | Correr la migración contra la copia restaurada | Salida del comando | | |
| D15 | El plan de consultas en producción se parece al esperado | `EXPLAIN` de los listados críticos contra el volumen real | Plan, con el número de filas de la tabla | | |

**D9 es el punto más importante de esta lista.** *Un backup nunca restaurado no es un backup* — es
una carpeta que nadie ha abierto. Era el mejor punto del checklist de seguridad y se mudó aquí
justamente para que llevara fecha.

**D11 con aislamiento por políticas de base de datos:** con un rol superusuario las políticas **no
se aplican** y todos los tests siguen verdes. Es la falla más silenciosa del conjunto.

---

## 4 · Secretos

| # | Punto | Cómo se comprueba | Evidencia que lo cierra | Última | Estado |
|---|---|---|---|---|---|
| D16 | Toda credencial que alguna vez llegó a git está **rotada** | Lista de hallazgos de la revisión + confirmación de rotación en cada proveedor | Fecha de rotación por credencial | | |
| D17 | Las dependencias no tienen vulnerabilidades conocidas sin atender | Auditoría de dependencias de backend y de frontend | Salida del comando y qué se decidió con cada hallazgo | | |

**D16:** borrar el commit no cierra el punto. Un secreto que llegó a git ya es público. Lo único que
lo cierra es que la credencial vieja deje de servir.

---

## 5 · Observabilidad

| # | Punto | Cómo se comprueba | Evidencia que lo cierra | Última | Estado |
|---|---|---|---|---|---|
| D18 | El monitoreo de errores **recibe** eventos | Provocar un error en producción a propósito y buscarlo en el panel | Enlace al evento | | |
| D19 | El monitoreo no recibe datos personales | Mirar el evento de D18 completo | Captura sin datos personales | | |
| D20 | Los logs tienen retención definida y acceso acotado | Revisar la configuración del proveedor | Política y quién tiene acceso | | |
| D21 | El correo saliente llega de verdad | Disparar cada notificación del sistema contra un buzón real | Correo recibido, con su cuerpo | | |

**D18 no es "está configurado".** Un monitoreo configurado y sin eventos y uno que no está instalado
se ven exactamente igual desde el repo.

---

## 6 · Rendimiento y capacidad

| # | Punto | Cómo se comprueba | Evidencia que lo cierra | Última | Estado |
|---|---|---|---|---|---|
| D22 | La concurrencia real justifica (o no) la arquitectura elegida | Medir usuarios concurrentes en la hora pico | Medición, con fecha | | |

D22 existe para poder decir que **no** hace falta una cola de tareas, con un número en vez de una
opinión. Con pocos usuarios concurrentes, una operación larga en el hilo de la petición está bien;
la decisión de cambiarlo se toma con esta medición.

---

## Puntos que este repo no puede comprobar hoy

Se llena con los `NO VERIFICABLE` que las revisiones vayan produciendo por huecos del perfil o por
verificadores ausentes. **Cada línea dice qué falta, no qué se supone.**

| Punto | Qué skill lo pedía | Qué falta para poder comprobarlo |
|---|---|---|
| | | |

---

## Puntos que salieron de la línea base del 2026-09-02

Origen: `docs/00-deuda.md`, sección "NO VERIFICABLE".

| # | Punto | Skill de origen | Qué haría falta | Comprobado |
|---|---|---|---|---|
| D23 | Cada fila de la matriz de roles tiene su test | `security-checklist` #12 | Un `docs/02-contrato.md` con la matriz, y tests en el backend | nunca |
| D24 | El test de fuga entre academias existe y falla si se rompe el filtro | `aislamiento-de-datos` | `verificadores.tests_backend` distinto de `ninguno` | nunca |
| D25 | Un archivo no es lo que dice su extensión | `security-checklist` #16 | Probar subida de un ejecutable renombrado a `.jpg` sin escribir en la cuenta de Cloudinary de producción | nunca |
| D26 | Los datos sensibles no aparecen en logs ni notificaciones | `security-checklist` #23, #25 | Provocar errores y notificaciones reales y leer la salida | nunca |
| D27 | La aplicación no arranca sin sus secretos | `security-checklist` #19 | Quitar `SECRET_KEY` en Railway y ver si arranca con un valor por defecto | nunca |
| D28 | La restauración del backup de Railway funciona | — *(punto sin skill de origen)* | Restaurar un backup en una base vacía y comprobar los datos | nunca |
| D29 | El `CLOUDINARY_URL` de producción no es el mismo que el del `.env` local | — *(punto sin skill de origen)* | Comparar el valor en el panel de Railway con `backend/.env` | nunca |

**Los dos últimos de esa tabla no tienen skill de origen.** Se anotan igual para que no desaparezcan, pero ninguna
revisión los va a volver a levantar sola.

---

## Añadidos el 2026-09-07 (sesión 4)

| # | Punto | Qué haría falta | Comprobado |
|---|---|---|---|
| D30 | La migración `users/0009_registro_de_auditoria` está aplicada en producción | Correrla al desplegar. Es un `CreateModel`, reversible, sin datos que migrar | nunca |
| D31 | `SENTRY_DSN` configurado en Railway y llegando eventos | Crear el proyecto en sentry.io y pegar el DSN en las variables del servicio | nunca |
| D32 | Un evento real de Sentry llega **sin datos personales** | Provocar un error en producción y leer el evento en el panel. Los filtros están probados con tests, pero solo un evento real confirma la cadena completa | nunca |
| D33 | `allow_public_preview` activado en Longevity 360 | Admin de producción. Sin esto su catálogo no se ve sin login | nunca |
| D34 | La librería de Bunny Stream existe y tiene Token Authentication activado | Crear la cuenta y la librería; activar la opción en Settings | nunca |
| D35 | `BUNNY_STREAM_LIBRARY_ID` y `BUNNY_STREAM_TOKEN_KEY` en Railway | Copiarlos del panel de Bunny | nunca |
| D36 | Una URL firmada real reproduce, y expirada da 403 | Subir un video de prueba y comprobarlo con el reloj en la mano | nunca |
