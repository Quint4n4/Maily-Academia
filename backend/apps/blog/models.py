from django.conf import settings
from django.db import models
from django.utils.text import slugify


class BlogPost(models.Model):
    """A blog post written by an instructor or admin."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Borrador'
        PUBLISHED = 'published', 'Publicado'

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blog_posts',
    )
    title = models.CharField('título', max_length=255)
    slug = models.SlugField('slug', max_length=280, unique=True, blank=True)
    content = models.TextField('contenido')
    excerpt = models.TextField('extracto', blank=True, default='')
    cover_image = models.URLField('imagen de portada', blank=True, default='')
    status = models.CharField('estado', max_length=20, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField('fecha de publicación', null=True, blank=True)
    created_at = models.DateTimeField('creado', auto_now_add=True)
    updated_at = models.DateTimeField('actualizado', auto_now=True)

    class Meta:
        verbose_name = 'artículo del blog'
        verbose_name_plural = 'artículos del blog'
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while BlogPost.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
