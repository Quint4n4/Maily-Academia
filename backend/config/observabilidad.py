"""
Monitoreo de errores.

Se activa solo si existe la variable SENTRY_DSN. Sin ella, la aplicacion arranca
igual y no se envia nada: en local y en los tests no hace falta.

Lo importante de este archivo no es el alta del servicio, son los dos filtros de
abajo. El punto 24 de `security-checklist` dice que el monitoreo de errores
tampoco debe repetir el dato sensible, y un SDK sin configurar manda por defecto
el cuerpo de la peticion, las cookies y la sesion.

Ver docs/00-deuda.md, P1-4.
"""
import os

# Claves cuyo valor NUNCA se envia, aunque aparezcan dentro de la peticion o de
# las variables locales de la traza.
CLAVES_SENSIBLES = (
    'password', 'contrasena', 'contraseña', 'passwd', 'secret', 'token',
    'refresh', 'access', 'authorization', 'api_key', 'apikey',
    'stripe', 'card', 'cvv', 'curp', 'rfc',
)

# Datos personales que no aportan nada para depurar un error y si aparecen en
# un servicio externo son una fuga.
CLAVES_PERSONALES = (
    'email', 'correo', 'telefono', 'phone', 'direccion', 'address',
    'first_name', 'last_name', 'nombre', 'apellido', 'avatar',
)

REEMPLAZO = '[oculto]'


def _limpiar(valor, profundidad=0):
    """Sustituye por [oculto] todo lo que coincida con las listas de arriba."""
    if profundidad > 6:
        return valor
    if isinstance(valor, dict):
        limpio = {}
        for clave, contenido in valor.items():
            minuscula = str(clave).lower()
            if any(s in minuscula for s in CLAVES_SENSIBLES + CLAVES_PERSONALES):
                limpio[clave] = REEMPLAZO
            else:
                limpio[clave] = _limpiar(contenido, profundidad + 1)
        return limpio
    if isinstance(valor, (list, tuple)):
        return [_limpiar(v, profundidad + 1) for v in valor]
    return valor


def antes_de_enviar(evento, hint):
    """
    Ultimo filtro antes de que el evento salga del servidor.

    Se queda con lo que sirve para depurar --que fallo, donde, en que endpoint,
    que usuario por id-- y quita el resto.
    """
    # El id del usuario basta para reproducir; el correo y la IP no hacen falta.
    usuario = evento.get('user')
    if isinstance(usuario, dict):
        evento['user'] = {'id': usuario.get('id')}

    peticion = evento.get('request')
    if isinstance(peticion, dict):
        peticion.pop('cookies', None)
        peticion.pop('env', None)
        if 'headers' in peticion:
            peticion['headers'] = _limpiar(peticion['headers'])
        if 'data' in peticion:
            peticion['data'] = _limpiar(peticion['data'])

    # Las variables locales de cada marco de la traza tambien viajan.
    for excepcion in evento.get('exception', {}).get('values', []):
        for marco in excepcion.get('stacktrace', {}).get('frames', []):
            if 'vars' in marco:
                marco['vars'] = _limpiar(marco['vars'])

    evento.pop('breadcrumbs', None)  # pueden traer cuerpos de peticiones previas
    return evento


def iniciar_monitoreo():
    """Arranca Sentry si hay DSN. Devuelve True si quedo activo."""
    dsn = os.environ.get('SENTRY_DSN', '').strip()
    if not dsn:
        return False

    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=dsn,
        integrations=[DjangoIntegration()],
        environment=os.environ.get('SENTRY_ENVIRONMENT', 'production'),
        # send_default_pii=False es el valor por defecto y se deja explicito:
        # ponerlo en True manda correos, IPs y cookies.
        send_default_pii=False,
        before_send=antes_de_enviar,
        # Muestreo de rendimiento al 0: el plan gratuito se consume rapido con
        # trazas y hoy no hay un problema de rendimiento que investigar.
        traces_sample_rate=0.0,
    )
    return True
