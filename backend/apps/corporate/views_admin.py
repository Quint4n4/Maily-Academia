"""Vistas de administración para el portal corporativo."""
from datetime import date
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BenefitType, BenefitRequest, AvailabilitySchedule, AvailabilityException, Reservation
from .serializers import (
    BenefitTypeSerializer, BenefitRequestSerializer, AvailabilityScheduleSerializer,
    AvailabilityExceptionSerializer, ReservationSerializer,
)
from .permissions import IsCorporativoAdmin
from . import notifications as notif


class AdminBenefitListCreateView(generics.ListCreateAPIView):
    """Listar y crear tipos de beneficio (admin)."""
    serializer_class = BenefitTypeSerializer
    permission_classes = [IsCorporativoAdmin]

    def get_queryset(self):
        return BenefitType.objects.all().order_by('order', 'name')


class AdminBenefitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalle, edición y eliminación de un tipo de beneficio (admin)."""
    serializer_class = BenefitTypeSerializer
    permission_classes = [IsCorporativoAdmin]
    queryset = BenefitType.objects.all()


class AdminScheduleListCreateView(generics.ListCreateAPIView):
    """Listar y crear horarios de disponibilidad de un beneficio (admin)."""
    serializer_class = AvailabilityScheduleSerializer
    permission_classes = [IsCorporativoAdmin]

    def get_queryset(self):
        benefit_id = self.kwargs.get('benefit_id')
        return AvailabilitySchedule.objects.filter(benefit_type_id=benefit_id)

    def perform_create(self, serializer):
        benefit_id = self.kwargs.get('benefit_id')
        benefit = BenefitType.objects.get(pk=benefit_id)
        serializer.save(benefit_type=benefit)


class AdminScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalle, edición y eliminación de un horario (admin)."""
    serializer_class = AvailabilityScheduleSerializer
    permission_classes = [IsCorporativoAdmin]
    queryset = AvailabilitySchedule.objects.all()


class AdminExceptionListCreateView(generics.ListCreateAPIView):
    """Listar y crear excepciones de disponibilidad (admin)."""
    serializer_class = AvailabilityExceptionSerializer
    permission_classes = [IsCorporativoAdmin]

    def get_queryset(self):
        qs = AvailabilityException.objects.all()
        benefit_id = self.request.query_params.get('benefit_id')
        if benefit_id:
            qs = qs.filter(Q(benefit_type_id=benefit_id) | Q(benefit_type__isnull=True))
        return qs.order_by('date')


class AdminExceptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalle, edición y eliminación de una excepción (admin)."""
    serializer_class = AvailabilityExceptionSerializer
    permission_classes = [IsCorporativoAdmin]
    queryset = AvailabilityException.objects.all()


class AdminReservationListView(generics.ListAPIView):
    """Lista de todas las reservaciones con filtros (admin)."""
    serializer_class = ReservationSerializer
    permission_classes = [IsCorporativoAdmin]

    def get_queryset(self):
        qs = Reservation.objects.all().select_related('user', 'benefit_type')
        status_filter = self.request.query_params.get('status')
        benefit_id = self.request.query_params.get('benefit_type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if benefit_id:
            qs = qs.filter(benefit_type_id=benefit_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        return qs.order_by('-date', '-start_time')


class AdminReservationDetailView(generics.RetrieveUpdateAPIView):
    """Actualizar estado de una reservación (confirmar, completar, cancelar, etc.)."""
    serializer_class = ReservationSerializer
    permission_classes = [IsCorporativoAdmin]
    queryset = Reservation.objects.all()

    def partial_update(self, request, *args, **kwargs):
        reservation = self.get_object()
        new_status = request.data.get('status')
        admin_notes = request.data.get('admin_notes', reservation.admin_notes)

        # Validar estado
        valid_statuses = dict(Reservation._meta.get_field('status').choices)
        if new_status and new_status not in valid_statuses:
            return Response({'detail': 'Estado inválido.'}, status=400)

        old_status = reservation.status
        reservation.admin_notes = admin_notes
        if new_status:
            reservation.status = new_status
        if new_status == 'cancelled' and old_status != 'cancelled':
            reservation.cancelled_at = timezone.now()
            reservation.cancelled_by = request.user
            reservation.cancellation_reason = request.data.get('cancellation_reason', '')
        reservation.save()

        # Notificar al empleado según cambio de estado
        if new_status == 'confirmed' and old_status == 'pending':
            notif.notificar_reservacion_confirmada(reservation)
        elif new_status == 'cancelled' and old_status != 'cancelled':
            notif.notificar_reservacion_cancelada(reservation)

        return Response(ReservationSerializer(reservation).data)


class AdminRequestListView(generics.ListAPIView):
    """Lista de todas las solicitudes de beneficios con filtros (admin)."""
    serializer_class = BenefitRequestSerializer
    permission_classes = [IsCorporativoAdmin]

    def get_queryset(self):
        qs = BenefitRequest.objects.all().select_related('user', 'benefit_type')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        return qs.order_by('-created_at')


class AdminRequestDetailView(generics.RetrieveUpdateAPIView):
    """Aprobar, rechazar o marcar como entregada una solicitud (admin)."""
    serializer_class = BenefitRequestSerializer
    permission_classes = [IsCorporativoAdmin]
    queryset = BenefitRequest.objects.all()

    def partial_update(self, request, *args, **kwargs):
        benefit_request = self.get_object()
        new_status = request.data.get('status')
        admin_notes = request.data.get('admin_notes', benefit_request.admin_notes)

        benefit_request.admin_notes = admin_notes
        if new_status:
            benefit_request.status = new_status
            benefit_request.reviewed_by = request.user
            benefit_request.reviewed_at = timezone.now()
        benefit_request.save()

        # Notificar al empleado según la decisión
        if new_status == 'approved':
            notif.notificar_solicitud_aprobada(benefit_request)
        elif new_status == 'rejected':
            notif.notificar_solicitud_rechazada(benefit_request)

        return Response(BenefitRequestSerializer(benefit_request).data)


class AdminEmployeeListView(APIView):
    """Lista de empleados con su estado de perfil corporativo."""
    permission_classes = [IsCorporativoAdmin]

    def get(self, request):
        from apps.sections.models import SectionMembership

        memberships = SectionMembership.objects.filter(
            section__slug='corporativo-camsa',
            is_active=True,
        ).select_related('user', 'user__profile')

        data = []
        for m in memberships:
            u = m.user
            try:
                profile = u.profile
                dept = getattr(profile, 'department', '')
                pos = getattr(profile, 'position', '')
                avatar = bool(profile.avatar)
                complete = bool(avatar and dept and pos)
            except Exception:
                dept, pos, avatar, complete = '', '', False, False

            data.append({
                'id': u.id,
                'email': u.email,
                'name': u.get_full_name() or u.email,
                'department': dept,
                'position': pos,
                'has_photo': avatar,
                'profile_complete': complete,
                'date_joined': u.date_joined,
            })

        return Response(data)


class AdminCorporateStatsView(APIView):
    """Estadísticas generales del portal corporativo (admin)."""
    permission_classes = [IsCorporativoAdmin]

    def get(self, request):
        today = date.today()

        total_reservations = Reservation.objects.filter(
            status__in=['confirmed', 'completed']
        ).count()
        reservations_this_month = Reservation.objects.filter(
            date__year=today.year,
            date__month=today.month,
            status__in=['pending', 'confirmed', 'completed'],
        ).count()
        pending_reservations = Reservation.objects.filter(status='pending').count()
        pending_requests = BenefitRequest.objects.filter(status='pending').count()

        benefit_usage = list(
            Reservation.objects.filter(status__in=['confirmed', 'completed'])
            .values('benefit_type__name', 'benefit_type__color')
            .annotate(total=Count('id'))
            .order_by('-total')[:5]
        )

        return Response({
            'total_reservations': total_reservations,
            'reservations_this_month': reservations_this_month,
            'pending_reservations': pending_reservations,
            'pending_requests': pending_requests,
            'benefit_usage': benefit_usage,
        })
