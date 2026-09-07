from django.contrib import admin

from .models import Category, Course, CourseMaterial, Module, Lesson


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'section', 'parent', 'order', 'is_active', 'created_at']
    list_filter = ['section', 'is_active']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'level', 'status', 'price', 'created_at', 'category']
    list_filter = ['level', 'status', 'created_at', 'category']
    search_fields = ['title', 'description']
    inlines = [ModuleInline]


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order']
    list_filter = ['course']
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'module', 'video_provider', 'duration', 'order']
    list_filter = ['video_provider']


@admin.register(CourseMaterial)
class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'module', 'lesson', 'file_type', 'file_size', 'download_count', 'created_at']
    list_filter = ['file_type', 'course']
    search_fields = ['title', 'original_filename']
    raw_id_fields = ['course', 'module', 'lesson', 'uploaded_by']
