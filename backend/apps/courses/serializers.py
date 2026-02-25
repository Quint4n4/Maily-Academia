from rest_framework import serializers

from .models import Course, Module, Lesson


class LessonSerializer(serializers.ModelSerializer):
    video_url = serializers.URLField(required=False, allow_blank=True, default='')

    class Meta:
        model = Lesson
        fields = [
            'id', 'module', 'title', 'description',
            'video_url', 'video_provider', 'duration', 'order',
        ]
        read_only_fields = ['id']


class LessonCreateSerializer(serializers.ModelSerializer):
    """Used when creating lessons within a module context."""

    video_url = serializers.URLField(required=False, allow_blank=True, default='')

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'video_url', 'video_provider', 'duration', 'order']
        read_only_fields = ['id']


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    quiz = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'course', 'title', 'description', 'order', 'lessons', 'quiz']
        read_only_fields = ['id']

    def get_quiz(self, obj):
        try:
            q = obj.quiz
            return {'id': q.id, 'title': q.title, 'passing_score': q.passing_score}
        except Exception:
            return None


class ModuleCreateSerializer(serializers.ModelSerializer):
    """Used when creating modules within a course context."""

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order']
        read_only_fields = ['id']


class CourseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the course list endpoint."""

    instructor_name = serializers.SerializerMethodField()
    total_lessons = serializers.IntegerField(read_only=True, default=0)
    students_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'thumbnail', 'level',
            'duration', 'status', 'price', 'rating', 'instructor', 'instructor_name',
            'total_lessons', 'students_count', 'require_sequential_progress',
            'requires_final_evaluation', 'final_evaluation_duration_default',
            'created_at',
        ]
        read_only_fields = ['id', 'rating', 'created_at']

    def get_instructor_name(self, obj):
        return obj.instructor.get_full_name() or obj.instructor.username


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full serializer including nested modules and lessons."""

    instructor_name = serializers.SerializerMethodField()
    modules = ModuleSerializer(many=True, read_only=True)
    total_lessons = serializers.IntegerField(read_only=True, default=0)
    students_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'thumbnail', 'level',
            'duration', 'status', 'price', 'rating', 'instructor', 'instructor_name',
            'total_lessons', 'students_count', 'require_sequential_progress',
            'requires_final_evaluation', 'final_evaluation_duration_default',
            'created_at', 'updated_at', 'modules',
        ]
        read_only_fields = ['id', 'rating', 'created_at', 'updated_at']

    def get_instructor_name(self, obj):
        return obj.instructor.get_full_name() or obj.instructor.username


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating / updating a course."""

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'description',
            'thumbnail',
            'level',
            'duration',
            'status',
            'price',
            'require_sequential_progress',
            'requires_final_evaluation',
            'final_evaluation_duration_default',
        ]
        read_only_fields = ['id']
