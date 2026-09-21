from django.contrib import admin
from .models import Certificate, PlantillaDeDiploma, RecursoDeDiploma


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'verification_code', 'issued_at']
    list_filter = ['issued_at', 'course']
    search_fields = ['user__email', 'course__title', 'verification_code']
    readonly_fields = ['verification_code']
    # La copia congelada se mira, no se edita: un diploma emitido que alguien
    # puede reescribir desde el admin no prueba nada.
    readonly_fields += ['student_name', 'course_title', 'instructor_name', 'section_name']


@admin.register(PlantillaDeDiploma)
class PlantillaDeDiplomaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'alcance', 'section', 'owner', 'es_semilla', 'actualizado_en']
    list_filter = ['alcance', 'es_semilla', 'section']
    search_fields = ['nombre', 'owner__email']
    readonly_fields = ['creado_en', 'actualizado_en']

    # El documento se edita en el editor, no aqui: este formulario no pasa por
    # `validar_documento`, asi que un JSON mal escrito desde el admin se guarda
    # y revienta en la descarga del alumno.
    #
    # Se deja visible porque para depurar hace falta verlo.
    def get_readonly_fields(self, request, obj=None):
        return list(self.readonly_fields) + ['documento']


@admin.register(RecursoDeDiploma)
class RecursoDeDiplomaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'alcance', 'section', 'owner', 'creado_en']
    list_filter = ['tipo', 'alcance', 'section']
    search_fields = ['nombre', 'owner__email']
    readonly_fields = ['cloudinary_public_id', 'ancho_px', 'alto_px', 'creado_en']
