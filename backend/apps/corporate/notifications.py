"""Funciones helper para crear notificaciones corporativas y enviar emails."""
import logging
from .models import Notification

logger = logging.getLogger(__name__)


def crear_notificacion(user, title, message, notification_type,
                       related_object_type='', related_object_id=None):
    """Crea una notificación in-app para un usuario."""
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        related_object_type=related_object_type,
        related_object_id=related_object_id,
    )


def notificar_reservacion_confirmada(reservation):
    """Notifica al empleado que su cita fue confirmada."""
    crear_notificacion(
        user=reservation.user,
        title='Cita confirmada',
        message=(
            f'Tu cita de {reservation.benefit_type.name} el '
            f'{reservation.date.strftime("%d/%m/%Y")} a las '
            f'{reservation.start_time.strftime("%H:%M")} ha sido confirmada.'
        ),
        notification_type='reservation_confirmed',
        related_object_type='reservation',
        related_object_id=reservation.id,
    )
    _enviar_email_reservacion(reservation, 'confirmada')


def notificar_reservacion_cancelada(reservation):
    """Notifica al empleado que su cita fue cancelada."""
    crear_notificacion(
        user=reservation.user,
        title='Cita cancelada',
        message=(
            f'Tu cita de {reservation.benefit_type.name} el '
            f'{reservation.date.strftime("%d/%m/%Y")} ha sido cancelada.'
        ),
        notification_type='reservation_cancelled',
        related_object_type='reservation',
        related_object_id=reservation.id,
    )
    _enviar_email_reservacion(reservation, 'cancelada')


def notificar_solicitud_aprobada(benefit_request):
    """Notifica al empleado que su solicitud fue aprobada."""
    crear_notificacion(
        user=benefit_request.user,
        title='Solicitud aprobada',
        message=f'Tu solicitud de {benefit_request.benefit_type.name} ha sido aprobada.',
        notification_type='request_approved',
        related_object_type='benefit_request',
        related_object_id=benefit_request.id,
    )


def notificar_solicitud_rechazada(benefit_request):
    """Notifica al empleado que su solicitud fue rechazada."""
    motivo = f' Motivo: {benefit_request.admin_notes}' if benefit_request.admin_notes else ''
    crear_notificacion(
        user=benefit_request.user,
        title='Solicitud rechazada',
        message=f'Tu solicitud de {benefit_request.benefit_type.name} ha sido rechazada.{motivo}',
        notification_type='request_rejected',
        related_object_type='benefit_request',
        related_object_id=benefit_request.id,
    )


def _enviar_email_reservacion(reservation, estado):
    """Envía email de notificación de reservación usando Resend si está configurado."""
    try:
        import os
        resend_key = os.environ.get('RESEND_API_KEY')
        if not resend_key:
            return
        import resend
        resend.api_key = resend_key
        resend.Emails.send({
            'from': 'Corporativo CAMSA <noreply@mailycamsa.com>',
            'to': [reservation.user.email],
            'subject': f'Cita {estado} — {reservation.benefit_type.name}',
            'html': f'''
                <h2>Tu cita ha sido {estado}</h2>
                <p><strong>Beneficio:</strong> {reservation.benefit_type.name}</p>
                <p><strong>Fecha:</strong> {reservation.date.strftime("%d de %B de %Y")}</p>
                <p><strong>Hora:</strong> {reservation.start_time.strftime("%H:%M")} - {reservation.end_time.strftime("%H:%M")}</p>
                <p>Puedes ver tus citas en el portal corporativo.</p>
            ''',
        })
    except Exception as e:
        logger.warning(f'No se pudo enviar email de reservación: {e}')
