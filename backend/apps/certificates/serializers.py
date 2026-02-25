from rest_framework import serializers

from .models import Certificate


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
