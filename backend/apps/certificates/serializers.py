from rest_framework import serializers

from .documento import validar_documento
from .models import Certificate, PlantillaDeDiploma


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
        # fase 1: todavia no existe la galeria de recursos --es la fase 2-- asi
        # que ningun id de imagen puede ser valido y el conjunto va vacio a
        # proposito. Cuando exista `RecursoDeDiploma`, aqui entran los ids que
        # este usuario puede usar; dejarlo en None saltaria la comprobacion y
        # permitiria montar el marco de otra academia sabiendo su id.
        errores = validar_documento(valor, recursos_permitidos=set())
        if errores:
            raise serializers.ValidationError(errores)
        return valor
