from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import PromoVideo, Section, SectionMembership

User = get_user_model()


class SectionSerializer(serializers.ModelSerializer):
    """Serializer básico para listar/consultar secciones."""

    class Meta:
        model = Section
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'section_type',
            'logo',
            'is_active',
            'require_credentials',
            'allow_public_preview',
        ]
        read_only_fields = fields


class SectionMembershipSerializer(serializers.ModelSerializer):
    """
    Serializer de administración de membresías de sección.

    - Lectura: muestra información básica del usuario y de la sección.
    - Escritura (POST/PATCH): acepta `user_id` como identificador del usuario.
    """

    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.all(),
        write_only=True,
    )
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(
        source='user.get_full_name',
        read_only=True,
    )
    section_slug = serializers.SlugField(source='section.slug', read_only=True)

    class Meta:
        model = SectionMembership
        fields = [
            'id',
            'user_id',
            'user_email',
            'user_name',
            'section_slug',
            'role',
            'is_active',
            'granted_by',
            'granted_at',
            'expires_at',
        ]
        read_only_fields = [
            'id',
            'user_email',
            'user_name',
            'section_slug',
            'granted_by',
            'granted_at',
        ]


class PromoVideoSerializer(serializers.ModelSerializer):
    """Serializer público para listar videos de promoción (solo activos)."""

    class Meta:
        model = PromoVideo
        fields = ['id', 'title', 'description', 'embed_url', 'duration', 'order']
        read_only_fields = fields


class PromoVideoAdminSerializer(serializers.ModelSerializer):
    """Serializer para CRUD de videos de promoción (super-admin). Section se fija en la vista."""

    class Meta:
        model = PromoVideo
        fields = [
            'id',
            'section',
            'title',
            'description',
            'embed_url',
            'duration',
            'order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'section', 'created_at', 'updated_at']

