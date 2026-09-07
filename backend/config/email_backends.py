"""
Backend de email vía Resend API (HTTP).
Útil cuando SMTP está bloqueado (ej. Railway). Sin dependencias extra; usa urllib.
"""
import json
import logging
import urllib.request
import urllib.error

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)


class ResendEmailBackend(BaseEmailBackend):
    """
    Envía correos usando la API de Resend (https://resend.com).
    Configurar: RESEND_API_KEY y opcionalmente RESEND_FROM_EMAIL (o DEFAULT_FROM_EMAIL).
    """

    def __init__(self, api_key=None, from_email=None, fail_silently=False, **kwargs):
        self.api_key = api_key or getattr(settings, "RESEND_API_KEY", None) or ""
        self.from_email = from_email or getattr(
            settings, "RESEND_FROM_EMAIL", None
        ) or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        super().__init__(fail_silently=fail_silently, **kwargs)

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        if not self.api_key:
            if not self.fail_silently:
                raise ValueError("ResendEmailBackend requires RESEND_API_KEY")
            return 0
        sent = 0
        for message in email_messages:
            try:
                self._send_one(message)
                sent += 1
            except Exception as e:
                logger.exception("Resend send failed: %s", e)
                if not self.fail_silently:
                    raise
        return sent

    def _send_one(self, message):
        from_email = self.from_email or message.from_email
        to_list = list(message.to)
        if not to_list:
            return
        payload = {
            "from": from_email,
            "to": to_list,
            "subject": message.subject,
            "text": message.body or "",
        }
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MailyAcademia/1.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status >= 400:
                    body = resp.read().decode()
                    raise Exception(f"Resend API error {resp.status}: {body}")
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else str(e)
            raise Exception(f"Resend API HTTP {e.code}: {body}")
