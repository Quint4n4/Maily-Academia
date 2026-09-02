"""Serializadores para el portal corporativo."""
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import BenefitType, BenefitRequest, AvailabilitySchedule, AvailabilityException, Reservation, Notification


class BenefitTypeSerializer(serializers.ModelSerializer):
    reservation_count_month = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BenefitType
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'color',
            'benefit_mode', 'requires_approval', 'max_per_employee',
            'limit_period', 'slot_duration_minutes', 'instructions',
            'is_active', 'order', 'created_at', 'updated_at',
            'reservation_count_month',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_reservation_count_month(self, obj):
        """Contar reservaciones activas del mes actual."""
        now = timezone.now()
        return Reservation.objects.filter(
            benefit_type=obj,
            date__year=now.year,
            date__month=now.month,
            status__in=['pending', 'confirmed', 'completed'],
        ).count()


class AvailabilityScheduleSerializer(serializers.ModelSerializer):
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = AvailabilitySchedule
        fields = [
            'id', 'benefit_type', 'day_of_week', 'day_of_week_display',
            'start_time', 'end_time', 'max_concurrent_slots', 'is_active',
        ]
        # benefit_type se asigna desde la URL en perform_create, no se envía en el body
        read_only_fields = ['id', 'benefit_type']


class AvailabilityExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityException
        fields = ['id', 'benefit_type', 'date', 'is_blocked', 'start_time', 'end_time', 'reason']
        read_only_fields = ['id']


class ReservationSerializer(serializers.ModelSerializer):
    benefit_type_name = serializers.CharField(source='benefit_type.name', read_only=True)
    benefit_type_color = serializers.CharField(source='benefit_type.color', read_only=True)
    benefit_type_icon = serializers.CharField(source='benefit_type.icon', read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'user', 'user_name', 'benefit_type', 'benefit_type_name',
            'benefit_type_color', 'benefit_type_icon',
            'date', 'start_time', 'end_time', 'status', 'status_display',
            'notes', 'admin_notes',
            'cancelled_at', 'cancelled_by', 'cancellation_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'user_name', 'benefit_type_name', 'benefit_type_color',
            'benefit_type_icon', 'status_display', 'cancelled_at', 'cancelled_by',
            'created_at', 'updated_at',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class ReservationCreateSerializer(serializers.ModelSerializer):
    benefit_type_slug = serializers.SlugRelatedField(
        slug_field='slug',
        queryset=BenefitType.objects.filter(is_active=True),
        source='benefit_type',
        write_only=True,
    )

    class Meta:
        model = Reservation
        fields = ['benefit_type_slug', 'date', 'start_time', 'notes']

    def validate(self, data):
        benefit_type = data['benefit_type']
        date = data['date']
        start_time = data['start_time']
        user = self.context['request'].user

        if benefit_type.benefit_mode != 'appointment':
            raise serializers.ValidationError('Este beneficio no admite citas; usa solicitud.')

        # Calcular end_time
        start_dt = datetime.combine(date, start_time)
        end_dt = start_dt + timedelta(minutes=benefit_type.slot_duration_minutes)
        data['end_time'] = end_dt.time()

        # Verificar perfil completo
        try:
            profile = user.profile
            if not (profile.avatar and getattr(profile, 'department', None) and getattr(profile, 'position', None)):
                raise serializers.ValidationError(
                    'Debes completar tu perfil corporativo (foto, departamento y puesto) antes de agendar.'
                )
        except serializers.ValidationError:
            raise
        except Exception:
            pass

        # Verificar límite por empleado
        if benefit_type.max_per_employee > 0:
            now = timezone.now()
            qs = Reservation.objects.filter(
                user=user, benefit_type=benefit_type,
                status__in=['pending', 'confirmed', 'completed'],
            )
            if benefit_type.limit_period == 'monthly':
                qs = qs.filter(date__year=now.year, date__month=now.month)
            elif benefit_type.limit_period == 'yearly':
                qs = qs.filter(date__year=now.year)
            if qs.count() >= benefit_type.max_per_employee:
                raise serializers.ValidationError(
                    f'Ya alcanzaste el límite de {benefit_type.max_per_employee} uso(s) de este beneficio.'
                )

        # Verificar disponibilidad del slot
        occupied = Reservation.objects.filter(
            benefit_type=benefit_type,
            date=date,
            start_time=start_time,
            status__in=['pending', 'confirmed'],
        ).count()

        # Obtener max_concurrent de AvailabilitySchedule
        try:
            schedule = AvailabilitySchedule.objects.get(
                benefit_type=benefit_type,
                day_of_week=date.weekday(),
                is_active=True,
            )
            max_concurrent = schedule.max_concurrent_slots
        except AvailabilitySchedule.DoesNotExist:
            max_concurrent = 1

        if occupied >= max_concurrent:
            raise serializers.ValidationError('El horario seleccionado ya no está disponible.')

        return data

    def create(self, validated_data):
        user = self.context['request'].user
        benefit_type = validated_data['benefit_type']
        status = 'pending' if benefit_type.requires_approval else 'confirmed'
        reservation = Reservation.objects.create(
            user=user,
            benefit_type=benefit_type,
            date=validated_data['date'],
            start_time=validated_data['start_time'],
            end_time=validated_data['end_time'],
            notes=validated_data.get('notes', ''),
            status=status,
        )
        return reservation


class BenefitRequestSerializer(serializers.ModelSerializer):
    benefit_type_name = serializers.CharField(source='benefit_type.name', read_only=True)
    benefit_type_icon = serializers.CharField(source='benefit_type.icon', read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = BenefitRequest
        fields = [
            'id', 'user', 'user_name', 'benefit_type', 'benefit_type_name',
            'benefit_type_icon', 'status', 'status_display',
            'notes', 'admin_notes', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'user_name', 'status', 'status_display',
            'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class BenefitRequestCreateSerializer(serializers.ModelSerializer):
    benefit_type_slug = serializers.SlugRelatedField(
        slug_field='slug',
        queryset=BenefitType.objects.filter(is_active=True, benefit_mode='request'),
        source='benefit_type',
        write_only=True,
    )

    class Meta:
        model = BenefitRequest
        fields = ['benefit_type_slug', 'notes']

    def create(self, validated_data):
        user = self.context['request'].user
        benefit_type = validated_data['benefit_type']
        # Verificar límite por empleado
        if benefit_type.max_per_employee > 0:
            now = timezone.now()
            qs = BenefitRequest.objects.filter(
                user=user, benefit_type=benefit_type,
                status__in=['pending', 'approved', 'delivered'],
            )
            if benefit_type.limit_period == 'monthly':
                qs = qs.filter(created_at__year=now.year, created_at__month=now.month)
            elif benefit_type.limit_period == 'yearly':
                qs = qs.filter(created_at__year=now.year)
            if qs.count() >= benefit_type.max_per_employee:
                raise serializers.ValidationError(
                    f'Ya alcanzaste el límite de {benefit_type.max_per_employee} solicitud(es) de este beneficio.'
                )
        return BenefitRequest.objects.create(
            user=user,
            benefit_type=benefit_type,
            notes=validated_data.get('notes', ''),
            status='pending',
        )


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'related_object_type', 'related_object_id', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
