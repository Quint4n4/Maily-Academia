"""
Bitacora de auditoria: quien hizo que, sobre que, y cuando.

Hasta el 2026-09-07 esto era un `logger.info` y nada mas. En Railway los logs se
rotan, asi que no quedaba registro consultable: el punto 26 de
`security-checklist` pide poder responder *quien vio o cambio este dato*, y un
log de texto que desaparece no lo responde.

Ahora cada accion sensible se guarda en `RegistroDeAuditoria`. Se sigue emitiendo
el log, que sirve para ver la actividad en vivo durante un incidente.

Ver docs/00-deuda.md, P1-2.
"""
import logging

logger = logging.getLogger('audit')

# Rutas cuyas escrituras se registran.
#
# Las tres ultimas se agregaron el 2026-09-07: cambian lo que la gente ve o
# recibe, y no habia forma de saber quien las hizo.
AUDIT_PATHS = (
    '/api/users/',                  # alta, baja y cambios de cuentas
    '/api/admin/',                  # todo lo administrativo
    '/api/auth/register/',
    '/api/auth/password-reset/',
    '/api/sections/',               # academias y membresias
    '/api/payments/',
    '/api/courses/',                # publicar o despublicar cambia lo que ve el alumno
    '/api/certificates/',           # emitir un certificado es un documento con nombre
    '/api/instructor/',             # acciones del panel de instructor
)

AUDIT_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')

# Metodo HTTP -> accion de negocio, para poder filtrar la bitacora por lo que
# se hizo y no por el verbo del protocolo.
ACCION_POR_METODO = {
    'POST': 'crear',
    'PUT': 'actualizar',
    'PATCH': 'actualizar',
    'DELETE': 'borrar',
}


class AuditLogMiddleware:
    """Registra las escrituras sobre endpoints sensibles."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        se_audita = (
            request.method in AUDIT_METHODS
            and any(request.path.startswith(p) for p in AUDIT_PATHS)
        )

        response = self.get_response(request)

        if se_audita:
            self._registrar(request, response)

        return response

    def _registrar(self, request, response):
        usuario = getattr(request, 'user', None)
        autenticado = bool(usuario and usuario.is_authenticated)
        ip = self._ip_del_cliente(request)

        logger.info(
            'AUDIT | user=%s | method=%s | path=%s | status=%s | ip=%s',
            usuario.id if autenticado else None,
            request.method, request.path, response.status_code, ip,
        )

        # La bitacora nunca debe tumbar la peticion. Si falla el guardado se
        # anota y se sigue: perder un registro es malo, devolver un 500 al
        # usuario porque no se pudo auditar es peor.
        try:
            from .models import RegistroDeAuditoria

            recurso, recurso_id = self._partir_ruta(request.path)
            RegistroDeAuditoria.objects.create(
                actor=usuario if autenticado else None,
                actor_email=getattr(usuario, 'email', '') if autenticado else '',
                accion=ACCION_POR_METODO.get(request.method, 'actualizar'),
                recurso=recurso[:255],
                recurso_id=recurso_id[:64],
                metodo=request.method,
                ruta=request.get_full_path()[:500],
                codigo_respuesta=response.status_code,
                ip=ip or None,
            )
        except Exception:
            logger.exception('No se pudo guardar el registro de auditoria')

    @staticmethod
    def _partir_ruta(path):
        """
        Separa la ruta del id: '/api/courses/34/' -> ('/api/courses/', '34').

        Asi se puede preguntar "quien toco el curso 34" sin recorrer cadenas.
        """
        partes = [p for p in path.split('/') if p]
        if partes and partes[-1].isdigit():
            return '/' + '/'.join(partes[:-1]) + '/', partes[-1]
        return path, ''

    @staticmethod
    def _ip_del_cliente(request):
        reenviada = request.META.get('HTTP_X_FORWARDED_FOR')
        if reenviada:
            # Railway pone la IP real primero y despues las de sus proxies.
            return reenviada.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
