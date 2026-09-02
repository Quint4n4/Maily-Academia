from django.contrib import admin
from .models import BenefitType, BenefitRequest, AvailabilitySchedule, AvailabilityException, Reservation, Notification


@admin.register(BenefitType)
class BenefitTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'benefit_mode', 'is_active', 'order']
    list_filter = ['benefit_mode', 'is_active']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ['user', 'benefit_type', 'date', 'start_time', 'status']
    list_filter = ['status', 'benefit_type']
    raw_id_fields = ['user', 'benefit_type']


@admin.register(BenefitRequest)
class BenefitRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'benefit_type', 'status', 'created_at']
    list_filter = ['status', 'benefit_type']


admin.site.register(AvailabilitySchedule)
admin.site.register(AvailabilityException)
admin.site.register(Notification)
