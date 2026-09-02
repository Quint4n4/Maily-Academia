from rest_framework import serializers

from .models import Enrollment, LessonProgress, Purchase


class PurchaseAdminSerializer(serializers.ModelSerializer):
    """Purchase list for admin dashboard."""

    course_title = serializers.CharField(source='course.title', read_only=True)
    course_id = serializers.IntegerField(source='course.id', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id', 'course_id', 'course_title', 'user_id', 'user_email',
            'amount', 'currency', 'status', 'payment_method',
            'stripe_payment_intent_id', 'receipt_url',
            'refund_amount', 'refund_status',
            'created_at', 'completed_at', 'paid_at',
        ]


class PurchaseStudentSerializer(serializers.ModelSerializer):
    """Información de compra para el alumno que la realizó."""

    course_title = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.SerializerMethodField()
    coupon_code = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = [
            'id', 'course', 'course_title', 'course_thumbnail',
            'amount', 'currency', 'status',
            'coupon_code', 'original_amount', 'discount_amount',
            'receipt_url', 'refund_status',
            'invoice_number',
            'created_at', 'completed_at',
        ]

    def get_course_thumbnail(self, obj):
        return getattr(obj.course, 'thumbnail', None) or ''

    def get_coupon_code(self, obj):
        return obj.coupon.code if obj.coupon else None

    def get_invoice_number(self, obj):
        try:
            return obj.invoice.invoice_number
        except Exception:
            return None


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'user', 'course', 'course_title', 'enrolled_at']
        read_only_fields = ['id', 'user', 'enrolled_at']


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ['id', 'user', 'lesson', 'completed', 'completed_at', 'video_position_seconds']
        read_only_fields = ['id', 'user', 'completed_at']


class CourseProgressSerializer(serializers.Serializer):
    """Computed progress for a student in a specific course."""

    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    total_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    progress_percent = serializers.FloatField()
    quizzes_passed = serializers.IntegerField()
    total_quizzes = serializers.IntegerField()
    passed_quiz_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    resume_at = serializers.DictField(required=False, allow_null=True)
    require_sequential_progress = serializers.BooleanField(required=False, default=False)
    completed_lesson_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    lesson_positions = serializers.DictField(child=serializers.IntegerField(), required=False, default=dict)


class DashboardSerializer(serializers.Serializer):
    """Summary for the student dashboard."""

    enrolled_courses = serializers.IntegerField()
    completed_courses = serializers.IntegerField()
    total_lessons_completed = serializers.IntegerField()
    total_quizzes_passed = serializers.IntegerField()
    certificates_earned = serializers.IntegerField()
    courses = CourseProgressSerializer(many=True)
