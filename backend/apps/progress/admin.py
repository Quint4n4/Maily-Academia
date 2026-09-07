from django.contrib import admin
from .models import Enrollment, LessonProgress, Purchase


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'amount', 'status', 'payment_method', 'paid_at']
    list_filter = ['status', 'payment_method']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'enrolled_at']
    list_filter = ['enrolled_at', 'course']
    search_fields = ['user__email', 'course__title']


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'completed', 'completed_at']
    list_filter = ['completed', 'completed_at']
