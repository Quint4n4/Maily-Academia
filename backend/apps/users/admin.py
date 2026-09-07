from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Profile, RegistroDeAuditoria


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'first_name', 'last_name', 'role', 'is_super_admin', 'is_active']
    list_filter = ['role', 'is_super_admin', 'is_active', 'date_joined']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-date_joined']
    inlines = [ProfileInline]

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Rol', {'fields': ('role', 'is_super_admin')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Rol', {'fields': ('role', 'is_super_admin')}),
    )


@admin.register(RegistroDeAuditoria)
class RegistroDeAuditoriaAdmin(admin.ModelAdmin):
    """
    La bitacora, consultable desde el admin.

    El punto 26 de `security-checklist` no se cumple guardando los registros:
    se cumple pudiendo responder *quien vio o cambio este dato*. Por eso los
    filtros son por actor y por recurso, que son las dos preguntas reales.
    """

    list_display = ('creado', 'actor_email', 'accion', 'recurso', 'recurso_id', 'codigo_respuesta', 'ip')
    list_filter = ('accion', 'recurso', 'codigo_respuesta', 'creado')
    search_fields = ('actor_email', 'recurso', 'recurso_id', 'ruta', 'ip')
    date_hierarchy = 'creado'
    ordering = ('-creado',)

    # La bitacora es de solo lectura: una que se puede editar no prueba nada.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
