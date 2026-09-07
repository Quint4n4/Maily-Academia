from rest_framework import serializers

from apps.utils.sanitize import sanitize_html
from .models import BlogPost


class BlogPostListSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'author', 'author_name', 'title', 'slug', 'excerpt',
            'cover_image', 'status', 'published_at', 'created_at',
        ]
        read_only_fields = ['id', 'author', 'slug', 'created_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username


class BlogPostDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'author', 'author_name', 'title', 'slug', 'content',
            'excerpt', 'cover_image', 'status', 'published_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author', 'slug', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username


class BlogPostCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'content', 'excerpt', 'cover_image', 'status', 'published_at']
        read_only_fields = ['id']

    def validate_content(self, value):
        return sanitize_html(value)

    def validate_excerpt(self, value):
        return sanitize_html(value)
