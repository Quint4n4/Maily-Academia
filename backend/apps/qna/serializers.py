from rest_framework import serializers

from apps.utils.sanitize import sanitize_html
from .models import QnAQuestion, QnAAnswer


class QnAAnswerSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = QnAAnswer
        fields = ['id', 'question', 'user', 'user_name', 'user_role', 'body', 'is_accepted', 'created_at']
        read_only_fields = ['id', 'user', 'question', 'is_accepted', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class QnAQuestionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    answers = QnAAnswerSerializer(many=True, read_only=True)
    answers_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = QnAQuestion
        fields = [
            'id', 'lesson', 'user', 'user_name', 'title', 'body',
            'created_at', 'answers_count', 'answers',
        ]
        read_only_fields = ['id', 'user', 'lesson', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class QnAQuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QnAQuestion
        fields = ['id', 'title', 'body']
        read_only_fields = ['id']

    def validate_body(self, value):
        return sanitize_html(value)


class QnAAnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QnAAnswer
        fields = ['id', 'body']
        read_only_fields = ['id']

    def validate_body(self, value):
        return sanitize_html(value)
