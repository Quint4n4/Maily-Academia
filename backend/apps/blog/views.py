from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.users.permissions import IsAdminOrInstructor, IsOwnerOrAdmin

from .models import BlogPost
from .serializers import (
    BlogPostListSerializer,
    BlogPostDetailSerializer,
    BlogPostCreateUpdateSerializer,
)


class BlogPostListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/blog/   – public list of published posts
    POST /api/blog/   – create post (instructor/admin)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminOrInstructor()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BlogPostCreateUpdateSerializer
        return BlogPostListSerializer

    def get_queryset(self):
        qs = BlogPost.objects.select_related('author')
        if not self.request.user.is_authenticated or self.request.user.role == 'student':
            return qs.filter(status='published')
        if self.request.user.role == 'instructor':
            from django.db.models import Q
            return qs.filter(Q(status='published') | Q(author=self.request.user))
        return qs

    search_fields = ['title', 'content']
    ordering_fields = ['published_at', 'created_at']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class BlogPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/blog/{slug}/   – public detail
    PATCH  /api/blog/{slug}/   – edit (author or admin)
    DELETE /api/blog/{slug}/   – delete (author or admin)
    """

    lookup_field = 'slug'

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminOrInstructor()]

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return BlogPostCreateUpdateSerializer
        return BlogPostDetailSerializer

    def get_queryset(self):
        return BlogPost.objects.select_related('author')
