# Desplegar Maily Academia en Railway (plan Hobby)

Este proyecto está listo para desplegarse en [Railway](https://railway.com) con el plan Hobby.

## Requisitos

- Cuenta en [Railway](https://railway.com)
- Repositorio en GitHub (por ejemplo `Quint4n4/Maily-Academia`)

## Pasos para desplegar

### 1. Conectar el repositorio

1. Entra en [railway.com](https://railway.com) e inicia sesión.
2. Crea un **nuevo proyecto** → **Deploy from GitHub repo**.
3. Elige el repositorio (ej. `Maily-Academia`).
4. Si el código está en una subcarpeta (por ejemplo `cursos-maily`), en **Settings** del servicio → **Build** → **Root Directory** pon esa carpeta (ej. `cursos-maily`). Si el repo es solo este proyecto, deja el root en blanco.

### 2. Configuración automática

El proyecto ya incluye:

- **Build:** `npm run build` (genera la carpeta `dist/`)
- **Start:** `npm run start` (sirve los estáticos con `serve` en el puerto que asigne Railway)
- **railway.toml** con build command, start command y healthcheck

Railway usará la configuración del repo; no hace falta configurar comandos a mano salvo que quieras cambiarlos.

### 3. Dominio público

1. En el proyecto, abre el **servicio** de la app.
2. Ve a **Settings** → **Networking**.
3. Pulsa **Generate Domain**.
4. Copia la URL (ej. `maily-academia.up.railway.app`) y ábrela en el navegador.

### 4. Variables de entorno (opcional)

Por ahora la app no requiere variables de entorno. Si más adelante añades API keys o URLs de backend:

- **Settings** → **Variables** → añade cada variable (ej. `VITE_API_URL`).
- Tras cambiar variables, Railway puede redeployar solo; si no, usa **Redeploy** en **Deployments**.

## Plan Hobby

- Incluye un **crédito mensual** (suele bastar para una app estática/SPA como esta).
- Si superas el uso, Railway te avisa; puedes poner **límites de gasto** en **Project** → **Settings** → **Usage**.
- Documentación: [Railway Pricing](https://docs.railway.com/pricing/plans).

## Despliegue desde la CLI (opcional)

```bash
npm i -g @railway/cli
railway login
cd cursos-maily   # o la raíz del repo si es este proyecto
railway init      # crea/vincular proyecto
railway up        # sube y despliega
```

Luego genera el dominio desde el dashboard (Networking → Generate Domain).

## Comprobar que todo va bien

- **Deployments:** que el último despliegue esté en estado **Success**.
- **Logs:** que no haya errores al arrancar y que aparezca algo como “Serving!” de `serve`.
- **URL:** abrir la URL generada y comprobar que carga la app (login, rutas, etc.).

Si algo falla, revisa los logs del servicio en Railway y el [troubleshooting de Railway](https://docs.railway.com/deployments/troubleshooting/slow-deployments).
