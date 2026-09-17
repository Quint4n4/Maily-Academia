from rest_framework import serializers

from .models import Coupon, Enrollment, LessonProgress, Purchase


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


# ---------------------------------------------------------------------------
# Cupones — panel de administración
#
# Entrada y salida separadas a propósito, aunque hoy compartan casi los mismos
# campos: el día que la salida gane uno interno, el de escritura no lo hereda.
# ---------------------------------------------------------------------------
class _CouponCodigoMixin:
    """Normaliza y valida el código sin depender del navegador.

    El panel manda el código en mayúsculas
    (`cursos-maily/src/pages/admin/CouponFormModal.jsx:99`), pero el servidor no
    puede confiar en eso: al canjear, `views_payments.py:89` y `:513` buscan con
    `Coupon.objects.get(code=...)` — coincidencia EXACTA sobre un código que la
    vista ya pasó a mayúsculas. Un cupón guardado como `verano20` desde Swagger
    o desde curl nunca se podría canjear, y nadie sabría por qué.

    La unicidad se comprueba aquí y no con el validador de DRF porque el de DRF
    compara exacto: con `VERANO20` ya existente, un alta de `verano20` pasaría
    su filtro y reventaría contra el índice único de la base con un 500.
    """

    def validate_code(self, value: str) -> str:
        codigo = (value or '').strip().upper()
        if not codigo:
            raise serializers.ValidationError('El código es obligatorio.')

        repetidos = Coupon.objects.filter(code__iexact=codigo)
        if self.instance is not None:
            repetidos = repetidos.exclude(pk=self.instance.pk)
        if repetidos.exists():
            raise serializers.ValidationError('Ya existe un cupón con este código.')
        return codigo


class CouponAdminSerializer(serializers.ModelSerializer):
    """Salida del CRUD de cupones. Solo lectura, en todos sus campos.

    `times_used` es el nombre que la pantalla ya usa
    (`cursos-maily/src/pages/admin/CouponManagement.jsx:163`); el campo del
    modelo se llama `current_uses`. Se mapea aquí en vez de renombrar la
    columna: renombrarla es una migración sobre una tabla en producción, y el
    nombre de una columna no vale eso.
    """

    times_used = serializers.IntegerField(source='current_uses', read_only=True)
    last_used_at = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'description', 'discount_type', 'discount_value',
            'max_uses', 'times_used', 'last_used_at', 'valid_from',
            'valid_until', 'is_active', 'applicable_courses', 'created_at',
        ]
        read_only_fields = fields

    def get_last_used_at(self, obj):
        """Fecha del ultimo canje cobrado. Anotada por el selector, no columna.

        `getattr` con defecto en vez de `obj.last_used_at` a secas porque la
        respuesta del alta se serializa sobre la instancia recien creada por el
        servicio, que no pasa por el selector y por tanto no trae la anotacion.
        Un cupon recien creado no tiene canjes, asi que `None` es la respuesta
        correcta ahi; leerlo directo seria un AttributeError --un 500 en el
        POST-- por un campo derivado.
        """
        return getattr(obj, 'last_used_at', None)


class CouponCreateSerializer(_CouponCodigoMixin, serializers.ModelSerializer):
    """Entrada del alta. Los campos son los del payload del modal."""

    # Declarado a mano para quitarle el `UniqueValidator` que el modelo le
    # pondria solo: ese compara exacto y dejaria pasar `verano20` con
    # `VERANO20` ya en la base. La unicidad la revisa `validate_code`, que
    # cubre los dos casos con un solo mensaje.
    code = serializers.CharField(max_length=50)

    class Meta:
        model = Coupon
        fields = [
            'code', 'description', 'discount_type', 'discount_value',
            'max_uses', 'valid_from', 'valid_until', 'is_active',
            'applicable_courses',
        ]


class CouponUpdateSerializer(_CouponCodigoMixin, serializers.ModelSerializer):
    """Entrada de la edición. Se usa siempre en modo parcial (PATCH).

    Mismos campos que el alta, clase aparte: el día que el código deje de ser
    editable después de creado, se quita de aquí sin tocar el alta.
    """

    # Declarado a mano para quitarle el `UniqueValidator` que el modelo le
    # pondria solo: ese compara exacto y dejaria pasar `verano20` con
    # `VERANO20` ya en la base. La unicidad la revisa `validate_code`, que
    # cubre los dos casos con un solo mensaje.
    code = serializers.CharField(max_length=50)

    class Meta:
        model = Coupon
        fields = [
            'code', 'description', 'discount_type', 'discount_value',
            'max_uses', 'valid_from', 'valid_until', 'is_active',
            'applicable_courses',
        ]
