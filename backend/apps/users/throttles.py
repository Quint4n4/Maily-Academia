"""
Throttling for auth endpoints (login, register) to limit brute-force and abuse.
"""
from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """
    Strict rate limit for login and register (e.g. 5 requests per minute per IP).
    Configure THROTTLE_RATES['auth'] in Django settings.
    """
    scope = 'auth'
