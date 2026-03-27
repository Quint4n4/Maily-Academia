"""
Middleware de auditoría para registrar acciones sensibles.

Para activar, agregar a MIDDLEWARE en config/settings.py:
    'apps.users.middleware.AuditLogMiddleware',
"""
import logging
import time

logger = logging.getLogger('audit')

# Endpoints sensibles que merecen auditoría
AUDIT_PATHS = (
    '/api/users/',
    '/api/admin/',
    '/api/auth/register/',
    '/api/auth/password-reset/',
    '/api/sections/',
    '/api/payments/',
)

AUDIT_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')


class AuditLogMiddleware:
    """Registra acciones de escritura en endpoints sensibles."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        should_audit = (
            request.method in AUDIT_METHODS
            and any(request.path.startswith(p) for p in AUDIT_PATHS)
        )

        response = self.get_response(request)

        if should_audit:
            user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') else None
            ip = self._get_client_ip(request)
            logger.info(
                'AUDIT | user=%s | method=%s | path=%s | status=%s | ip=%s',
                user_id,
                request.method,
                request.path,
                response.status_code,
                ip,
            )

        return response

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
