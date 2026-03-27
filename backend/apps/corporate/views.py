"""Vistas para empleados del portal corporativo."""
from collections import Counter
from datetime import datetime, date, timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import (
    BenefitType, BenefitRequest, AvailabilitySchedule,
    AvailabilityException, Reservation, Notification,
)
from .serializers import (
    BenefitTypeSerializer, BenefitRequestSerializer, BenefitRequestCreateSerializer,
    ReservationSerializer, ReservationCreateSerializer, NotificationSerializer,
)
from .permissions import IsCorporativoMember
from . import notifications as notif


class BenefitTypeListView(generics.ListAPIView):
    """Lista de beneficios activos del portal corporativo."""
    serializer_class = BenefitTypeSerializer
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def get_queryset(self):
        return BenefitType.objects.filter(is_active=True).order_by('order', 'name')


class BenefitAvailabilityView(APIView):
    """Slots disponibles para un beneficio en un rango de fechas."""
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def get(self, request, slug):
        try:
            benefit = BenefitType.objects.get(slug=slug, is_active=True, benefit_mode='appointment')
        except BenefitType.DoesNotExist:
            return Response({'detail': 'Beneficio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')

        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date() if date_from_str else date.today()
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date() if date_to_str else (date_from + timedelta(days=30))
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Formato de fecha inválido. Usa YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Limitar rango a máximo 60 días
        if (date_to - date_from).days > 60:
            date_to = date_from + timedelta(days=60)

        schedules = {
            s.day_of_week: s
            for s in AvailabilitySchedule.objects.filter(benefit_type=benefit, is_active=True)
        }
        exceptions = {
            e.date: e
            for e in AvailabilityException.objects.filter(
                Q(benefit_type=benefit) | Q(benefit_type__isnull=True),
                date__gte=date_from,
                date__lte=date_to,
            )
        }

        result = {}
        current = date_from
        while current <= date_to:
            # Verificar excepción
            exc = exceptions.get(current)
            if exc and exc.is_blocked:
                result[str(current)] = {
                    'available': False,
                    'reason': exc.reason or 'No disponible',
                    'slots': [],
                }
                current += timedelta(days=1)
                continue

            # Obtener horario: excepción con horario especial o schedule normal
            if exc and not exc.is_blocked and exc.start_time and exc.end_time:
                start_t, end_t = exc.start_time, exc.end_time
                max_concurrent = 1
            elif current.weekday() in schedules:
                sch = schedules[current.weekday()]
                start_t, end_t = sch.start_time, sch.end_time
                max_concurrent = sch.max_concurrent_slots
            else:
                result[str(current)] = {
                    'available': False,
                    'reason': 'Sin horario disponible',
                    'slots': [],
                }
                current += timedelta(days=1)
                continue

            # Generar slots
            slots = []
            slot_start = datetime.combine(current, start_t)
            slot_end_limit = datetime.combine(current, end_t)
            duration = timedelta(minutes=benefit.slot_duration_minutes)

            # Reservaciones existentes para este día
            existing = Reservation.objects.filter(
                benefit_type=benefit,
                date=current,
                status__in=['pending', 'confirmed'],
            ).values_list('start_time', flat=True)
            occupied_counts = Counter(existing)

            while slot_start + duration <= slot_end_limit:
                t = slot_start.time()
                occupied = occupied_counts.get(t, 0)
                remaining = max(0, max_concurrent - occupied)
                slots.append({
                    'start': t.strftime('%H:%M'),
                    'end': (slot_start + duration).time().strftime('%H:%M'),
                    'available': remaining > 0,
                    'remaining': remaining,
                })
                slot_start += duration

            result[str(current)] = {
                'available': any(s['available'] for s in slots),
                'slots': slots,
            }
            current += timedelta(days=1)

        return Response({'benefit': BenefitTypeSerializer(benefit).data, 'dates': result})


class BenefitRequestCreateView(generics.CreateAPIView):
    """Crear una solicitud de beneficio tipo 'request' (sin horario)."""
    serializer_class = BenefitRequestCreateSerializer
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def perform_create(self, serializer):
        benefit_request = serializer.save()
        # Si no requiere aprobación, aprobar automáticamente
        if not benefit_request.benefit_type.requires_approval:
            benefit_request.status = 'approved'
            benefit_request.save(update_fields=['status'])
            notif.notificar_solicitud_aprobada(benefit_request)


class BenefitRequestListView(generics.ListAPIView):
    """Lista de mis solicitudes de beneficios."""
    serializer_class = BenefitRequestSerializer
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def get_queryset(self):
        qs = BenefitRequest.objects.filter(user=self.request.user).select_related('benefit_type')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class ReservationCreateView(generics.CreateAPIView):
    """Crear una reservación de cita agendada."""
    serializer_class = ReservationCreateSerializer
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def perform_create(self, serializer):
        reservation = serializer.save()
        if reservation.status == 'confirmed':
            notif.notificar_reservacion_confirmada(reservation)


class ReservationListView(generics.ListAPIView):
    """Mis reservaciones de citas."""
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def get_queryset(self):
        qs = Reservation.objects.filter(user=self.request.user).select_related('benefit_type')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs


class ReservationDetailView(generics.RetrieveAPIView):
    """Detalle de una reservación propia."""
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user)


class ReservationCancelView(APIView):
    """Cancelar una reservación propia (mínimo 24h de anticipación)."""
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def post(self, request, pk):
        try:
            reservation = Reservation.objects.get(pk=pk, user=request.user)
        except Reservation.DoesNotExist:
            return Response({'detail': 'Reservación no encontrada.'}, status=404)

        if reservation.status in ('cancelled', 'completed', 'no_show'):
            return Response({'detail': 'Esta reservación no se puede cancelar.'}, status=400)

        # Verificar mínimo 24h de anticipación
        reservation_datetime = datetime.combine(reservation.date, reservation.start_time)
        reservation_datetime = timezone.make_aware(reservation_datetime)
        if reservation_datetime - timezone.now() < timedelta(hours=24):
            return Response(
                {'detail': 'Solo puedes cancelar con al menos 24 horas de anticipación.'},
                status=400,
            )

        reason = request.data.get('reason', '')
        reservation.status = 'cancelled'
        reservation.cancelled_at = timezone.now()
        reservation.cancelled_by = request.user
        reservation.cancellation_reason = reason
        reservation.save()
        notif.notificar_reservacion_cancelada(reservation)
        return Response(ReservationSerializer(reservation).data)


class NotificationListView(generics.ListAPIView):
    """Mis notificaciones corporativas (últimas 50)."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:50]


class NotificationUnreadCountView(APIView):
    """Contador de notificaciones no leídas."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})


class NotificationMarkReadView(APIView):
    """Marcar notificaciones como leídas (por IDs o todas)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids', [])
        all_read = request.data.get('all', False)
        if all_read:
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        elif ids:
            Notification.objects.filter(user=request.user, id__in=ids).update(is_read=True)
        return Response({'ok': True})


class CorporateDashboardView(APIView):
    """Datos agregados para el dashboard corporativo del empleado."""
    permission_classes = [IsAuthenticated, IsCorporativoMember]

    def get(self, request):
        user = request.user
        today = date.today()

        # Próximas citas (próximos 30 días)
        upcoming_reservations = Reservation.objects.filter(
            user=user,
            date__gte=today,
            status__in=['pending', 'confirmed'],
        ).select_related('benefit_type').order_by('date', 'start_time')[:5]

        # Solicitudes pendientes
        pending_requests = BenefitRequest.objects.filter(
            user=user, status='pending'
        ).count()

        # Notificaciones no leídas
        unread_notifications = Notification.objects.filter(
            user=user, is_read=False
        ).count()

        # Verificar perfil completo
        profile_complete = False
        try:
            profile = user.profile
            profile_complete = bool(
                profile.avatar and
                getattr(profile, 'department', None) and
                getattr(profile, 'position', None)
            )
        except Exception:
            pass

        return Response({
            'profile_complete': profile_complete,
            'upcoming_reservations': ReservationSerializer(upcoming_reservations, many=True).data,
            'pending_requests_count': pending_requests,
            'unread_notifications': unread_notifications,
        })
