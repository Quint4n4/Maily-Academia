from django.contrib import admin
from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'verification_code', 'issued_at']
    list_filter = ['issued_at', 'course']
    search_fields = ['user__email', 'course__title', 'verification_code']
    readonly_fields = ['verification_code']
