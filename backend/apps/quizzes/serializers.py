from rest_framework import serializers

from .models import (
    Quiz,
    Question,
    QuizAttempt,
    FinalEvaluation,
    FinalEvaluationQuestion,
    FinalEvaluationRequest,
    FinalEvaluationAttempt,
)


def _sanitize_config_for_student(qtype, config):
    """Remove correct answers from config when sending to students."""
    if not config or not isinstance(config, dict):
        return config or {}
    out = dict(config)
    if qtype == 'word_order':
        out.pop('correct_order', None)
    if qtype == 'fill_blank':
        blanks = out.get('blanks') or []
        out['blanks'] = [{'id': b.get('id'), 'hint': b.get('hint')} for b in blanks]
    return out


class QuestionSerializer(serializers.ModelSerializer):
    """For students: exposes question_type and config (correct answers stripped)."""

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'options', 'config', 'order']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        qtype = getattr(instance, 'question_type', None) or 'multiple_choice'
        if 'config' in data and data['config']:
            data['config'] = _sanitize_config_for_student(qtype, data['config'])
        return data


class QuestionAdminSerializer(serializers.ModelSerializer):
    """Includes correct_answer – only for instructors/admin."""

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'text', 'question_type', 'options',
            'correct_answer', 'config', 'order',
        ]
        read_only_fields = ['id', 'quiz']

    def create(self, validated_data):
        config = validated_data.pop('config', None)
        if config is None:
            config = {}
        if not isinstance(config, dict):
            config = {}
        return Question.objects.create(**validated_data, config=config)

    def update(self, instance, validated_data):
        if 'config' in validated_data:
            config = validated_data.pop('config')
            if not isinstance(config, dict):
                config = getattr(instance, 'config', None) or {}
            validated_data['config'] = config
        return super().update(instance, validated_data)


class QuizSerializer(serializers.ModelSerializer):
    """Quiz with questions (correct answers hidden from students)."""

    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'module', 'title', 'passing_score', 'max_attempts', 'questions']
        read_only_fields = ['id']


class QuizCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'passing_score', 'max_attempts']
        read_only_fields = ['id']


class QuizAttemptCreateSerializer(serializers.Serializer):
    """Accepts student answers. Values can be int (multiple_choice), list (word_order, word_search), or dict (matching, fill_blank, crossword)."""

    answers = serializers.JSONField(
        help_text='Objeto {question_id: answer}. answer: int (multiple_choice), list (word_order/word_search), dict (matching/fill_blank/crossword)',
    )

    def validate_answers(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('answers debe ser un objeto con question_id como clave.')
        return value


class QuizAttemptResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ['id', 'quiz', 'answers', 'score', 'passed', 'attempted_at']
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Final evaluation serializers
# ---------------------------------------------------------------------------


class FinalEvaluationQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalEvaluationQuestion
        fields = ['id', 'text', 'options', 'order']


class FinalEvaluationQuestionAdminSerializer(serializers.ModelSerializer):
    """Incluye correct_answer – solo para profesores/admin."""

    class Meta:
        model = FinalEvaluationQuestion
        fields = ['id', 'evaluation', 'text', 'options', 'correct_answer', 'order']
        read_only_fields = ['id', 'evaluation']


class FinalEvaluationSerializer(serializers.ModelSerializer):
    """Evaluación final con preguntas (sin respuestas correctas)."""

    questions = FinalEvaluationQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = FinalEvaluation
        fields = ['id', 'course', 'title', 'passing_score', 'questions']
        read_only_fields = ['id', 'course']


class FinalEvaluationAdminSerializer(serializers.ModelSerializer):
    """Serializer para gestión de evaluación final (incluye respuestas correctas)."""

    questions = FinalEvaluationQuestionAdminSerializer(many=True, read_only=True)

    class Meta:
        model = FinalEvaluation
        fields = ['id', 'course', 'title', 'passing_score', 'questions']
        read_only_fields = ['id', 'course']


class FinalEvaluationAttemptCreateSerializer(serializers.Serializer):
    """Acepta respuestas del alumno para la evaluación final."""

    answers = serializers.DictField(
        child=serializers.IntegerField(),
        help_text='Objeto {question_id: selected_index}',
    )


class FinalEvaluationAttemptResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalEvaluationAttempt
        fields = ['id', 'evaluation', 'answers', 'score', 'passed', 'attempted_at']
        read_only_fields = fields


class FinalEvaluationRequestSerializer(serializers.ModelSerializer):
    """Resumen para panel de profesor."""

    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.EmailField(source='student.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = FinalEvaluationRequest
        fields = [
            'id',
            'student',
            'student_name',
            'student_email',
            'course',
            'course_title',
            'status',
            'requested_at',
            'approved_at',
            'available_from',
            'available_until',
        ]
        read_only_fields = [
            'id',
            'student',
            'course',
            'status',
            'requested_at',
            'approved_at',
            'available_from',
            'available_until',
        ]


class FinalEvaluationApproveSerializer(serializers.Serializer):
    """Datos que envía el profesor al aprobar una solicitud."""

    duration_minutes = serializers.IntegerField(min_value=1, max_value=7 * 24 * 60)
