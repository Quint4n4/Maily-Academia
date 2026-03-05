from django.contrib import admin

from .models import PromoVideo, Section, SectionMembership


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'section_type', 'is_active', 'require_credentials')
    list_filter = ('section_type', 'is_active', 'require_credentials')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(SectionMembership)
class SectionMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'section', 'role', 'is_active', 'granted_at', 'expires_at')
    list_filter = ('role', 'is_active', 'section__section_type')
    search_fields = ('user__email', 'user__username', 'section__name', 'section__slug')


@admin.register(PromoVideo)
class PromoVideoAdmin(admin.ModelAdmin):
    list_display = ('title', 'section', 'order', 'is_active', 'updated_at')
    list_filter = ('section', 'is_active')
    search_fields = ('title', 'description')
    ordering = ('section', 'order', 'id')

