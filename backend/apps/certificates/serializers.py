from rest_framework import serializers

from .documento import validar_documento
from .models import Certificate, PlantillaDeDiploma, RecursoDeDiploma


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id', 'user', 'user_name', 'course', 'course_title',
            'verification_code', 'issued_at',
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class CertificateVerifySerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = ['verification_code', 'user_name', 'course_title', 'issued_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class PlantillaDeDiplomaSerializer(serializers.ModelSerializer):
    """
    El `documento` se valida entero antes de guardarse.

    Si se guardara sin validar, el error aparece cuando un alumno descarga su
    diploma --no cuando el maestro lo edita-- y ese maestro se queda sin poder
    emitir hasta que alguien mire los registros del servidor.
    """

    puede_editarla = serializers.SerializerMethodField()

    class Meta:
        model = PlantillaDeDiploma
        fields = [
            'id', 'nombre', 'documento', 'alcance', 'section', 'owner',
            'es_semilla', 'creado_en', 'actualizado_en', 'puede_editarla',
        ]
        # El alcance, el dueno y la academia NO los elige el cliente: los pone
        # la vista segun quien pide. Si fueran escribibles, un maestro se crea
        # una plantilla con alcance "global" y su diseno sale en los diplomas
        # de las tres academias.
        read_only_fields = [
            'id', 'alcance', 'section', 'owner', 'es_semilla',
            'creado_en', 'actualizado_en', 'puede_editarla',
        ]

    def get_puede_editarla(self, obj) -> bool:
        from .selectors import plantillas_editables_por

        peticion = self.context.get('request')
        if peticion is None:
            return False
        return plantillas_editables_por(peticion.user).filter(pk=obj.pk).exists()

    def validate_documento(self, valor):
        # AMBITO>> Los ids que este usuario puede referenciar. Pasar None
        # saltaria la comprobacion y bastaria con escribir el id de un marco
        # ajeno en el documento para montarlo; un conjunto vacio, que es lo que
        # habia en la fase 1, rechazaria cualquier imagen.
        from .selectors import ids_de_recursos_permitidos

        peticion = self.context.get('request')
        permitidos = (
            ids_de_recursos_permitidos(peticion.user) if peticion is not None else set()
        )
        errores = validar_documento(valor, recursos_permitidos=permitidos)
        if errores:
            raise serializers.ValidationError(errores)
        return valor


class RecursoDeDiplomaSerializer(serializers.ModelSerializer):
    """Un marco, logo o sello de la galeria.

    La imagen no se manda aqui: se sube con multipart a la vista, que es la que
    la valida antes de que llegue a Cloudinary.
    """

    url = serializers.SerializerMethodField()
    proporcion = serializers.FloatField(read_only=True)
    puede_borrarlo = serializers.SerializerMethodField()

    class Meta:
        model = RecursoDeDiploma
        fields = [
            'id', 'tipo', 'nombre', 'url', 'ancho_px', 'alto_px', 'proporcion',
            'alcance', 'section', 'owner', 'creado_en', 'puede_borrarlo',
        ]
        read_only_fields = fields

    def get_url(self, obj) -> str:
        from .almacenamiento import url_de

        return url_de(obj.cloudinary_public_id)

    def get_puede_borrarlo(self, obj) -> bool:
        from .selectors import recursos_borrables_por

        peticion = self.context.get('request')
        if peticion is None:
            return False
        return recursos_borrables_por(peticion.user).filter(pk=obj.pk).exists()
