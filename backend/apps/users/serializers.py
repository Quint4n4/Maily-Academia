import re
import unicodedata

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Profile, SurveyResponse

User = get_user_model()

# Validation constants (align with frontend)
USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]+\Z')
NAME_MIN_LENGTH = 2
# Solo letras y espacios (nombres compuestos). Sin números ni símbolos.
NAME_ONLY_LETTERS_PATTERN = re.compile(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+\Z')
PASSWORD_MIN_LENGTH = 10
PHONE_PATTERN = re.compile(r'^[0-9]{10}$')


def generate_unique_username(first_name, last_name):
    """Genera un username único basado en nombre y apellido."""
    # Normalizar y limpiar el nombre
    fn = first_name.strip().lower()
    ln = last_name.strip().lower()
    
    # Remover acentos
    fn = unicodedata.normalize('NFD', fn)
    fn = ''.join(c for c in fn if unicodedata.category(c) != 'Mn')
    ln = unicodedata.normalize('NFD', ln)
    ln = ''.join(c for c in ln if unicodedata.category(c) != 'Mn')
    
    # Crear base del username
    base_username = f"{fn}_{ln}"
    base_username = re.sub(r'[^a-z0-9_]', '', base_username)[:25]
    
    # Asegurar unicidad
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
    
    return username


class ProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            'bio',
            'phone',
            'avatar',
            'country',
            'state',
            'city',
            'date_of_birth',
            'occupation_type',
            'has_completed_survey',
            'age',
        ]

    def get_age(self, obj):
        return obj.age


class UserSerializer(serializers.ModelSerializer):
    """Public-facing user representation."""

    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'is_active', 'date_joined', 'profile',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_active', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """Registration serializer for students with phone and auto-generated username."""

    password = serializers.CharField(write_only=True, min_length=PASSWORD_MIN_LENGTH)
    password_confirm = serializers.CharField(write_only=True, min_length=PASSWORD_MIN_LENGTH)
    phone = serializers.CharField(required=True, max_length=20)
    country = serializers.CharField(required=False, allow_blank=True, max_length=100)
    state = serializers.CharField(required=False, allow_blank=True, max_length=100)
    city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'phone',
            'password',
            'password_confirm',
            'country',
            'state',
            'city',
            'date_of_birth',
        ]

    def _validate_name(self, value, field_label):
        value = (value or '').strip()
        if len(value) < NAME_MIN_LENGTH:
            raise serializers.ValidationError(
                f'{field_label} debe tener al menos {NAME_MIN_LENGTH} caracteres.'
            )
        if not NAME_ONLY_LETTERS_PATTERN.match(value):
            raise serializers.ValidationError(
                f'{field_label} solo puede contener letras.'
            )
        return value

    def validate_first_name(self, value):
        return self._validate_name(value, 'El nombre')

    def validate_last_name(self, value):
        return self._validate_name(value, 'El apellido')

    def validate_phone(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('El teléfono es requerido.')
        if not PHONE_PATTERN.match(value):
            raise serializers.ValidationError('El teléfono debe tener exactamente 10 dígitos numéricos.')
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError('Este número de teléfono ya está registrado.')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        return data

    def create(self, validated_data):
        country = validated_data.pop('country', '')
        state = validated_data.pop('state', '')
        city = validated_data.pop('city', '')
        date_of_birth = validated_data.pop('date_of_birth', None)
        validated_data.pop('password_confirm')

        # Generar username único automáticamente
        username = generate_unique_username(
            validated_data['first_name'],
            validated_data['last_name']
        )
        
        try:
            user = User.objects.create_user(
                email=validated_data['email'],
                username=username,
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                phone=validated_data['phone'],
                password=validated_data['password'],
                role=User.Role.STUDENT,
            )
        except DjangoValidationError as e:
            msg = e.messages[0] if e.messages else str(e)
            raise serializers.ValidationError({'password': msg})
        Profile.objects.create(
            user=user,
            country=country or '',
            state=state or '',
            city=city or '',
            date_of_birth=date_of_birth,
        )
        return user


class MeSerializer(serializers.ModelSerializer):
    """Serializer for the authenticated user to view/edit their own data."""

    profile = ProfileSerializer()
    instructor_section = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'is_super_admin', 'date_joined', 'profile', 'instructor_section',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_super_admin', 'date_joined']

    def get_role(self, obj):
        """Superusers y staff se exponen como 'admin' para el frontend."""
        if obj.is_superuser or obj.is_staff:
            return User.Role.ADMIN
        return obj.role

    def get_instructor_section(self, obj):
        if obj.role != User.Role.INSTRUCTOR:
            return None
        from apps.sections.models import SectionMembership
        membership = (
            SectionMembership.objects
            .filter(user=obj, role=SectionMembership.Role.INSTRUCTOR, is_active=True)
            .select_related('section')
            .first()
        )
        if membership:
            return {
                'id': membership.section.id,
                'slug': membership.section.slug,
                'name': membership.section.name,
            }
        return None

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data:
            profile, _ = Profile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


class SurveyResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyResponse
        fields = [
            'occupation_type',
            'interests',
            'other_interests',
            'completed_at',
        ]
        read_only_fields = ['completed_at']


class InstructorCreateSerializer(serializers.ModelSerializer):
    """Admin-only serializer to create instructor accounts."""

    password = serializers.CharField(write_only=True, min_length=PASSWORD_MIN_LENGTH)
    section_slug = serializers.CharField(required=False, allow_blank=True, write_only=True, default='')

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'section_slug']

    def validate_section_slug(self, value):
        if not value:
            return value
        from apps.sections.models import Section
        if not Section.objects.filter(slug=value).exists():
            raise serializers.ValidationError(f'No existe una sección con slug "{value}".')
        return value

    def validate_username(self, value):
        value = (value or '').strip()
        if len(value) < USERNAME_MIN_LENGTH:
            raise serializers.ValidationError(
                f'El usuario debe tener al menos {USERNAME_MIN_LENGTH} caracteres.'
            )
        if len(value) > USERNAME_MAX_LENGTH:
            raise serializers.ValidationError(
                f'El usuario no puede tener más de {USERNAME_MAX_LENGTH} caracteres.'
            )
        if not USERNAME_PATTERN.match(value):
            raise serializers.ValidationError(
                'El usuario solo puede contener letras, números y guión bajo.'
            )
        if value.isdigit():
            raise serializers.ValidationError('El usuario no puede ser solo números.')
        return value

    def validate_first_name(self, value):
        value = (value or '').strip()
        if len(value) < NAME_MIN_LENGTH:
            raise serializers.ValidationError(f'El nombre debe tener al menos {NAME_MIN_LENGTH} caracteres.')
        if not NAME_ONLY_LETTERS_PATTERN.match(value):
            raise serializers.ValidationError('El nombre solo puede contener letras.')
        return value

    def validate_last_name(self, value):
        value = (value or '').strip()
        if len(value) < NAME_MIN_LENGTH:
            raise serializers.ValidationError(f'El apellido debe tener al menos {NAME_MIN_LENGTH} caracteres.')
        if not NAME_ONLY_LETTERS_PATTERN.match(value):
            raise serializers.ValidationError('El apellido solo puede contener letras.')
        return value

    def create(self, validated_data):
        section_slug = validated_data.pop('section_slug', '')
        try:
            user = User.objects.create_user(
                email=validated_data['email'],
                username=validated_data['username'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                password=validated_data['password'],
                role=User.Role.INSTRUCTOR,
            )
        except DjangoValidationError as e:
            msg = e.messages[0] if e.messages else str(e)
            raise serializers.ValidationError({'password': msg})
        Profile.objects.create(user=user)
        if section_slug:
            from apps.sections.models import Section, SectionMembership
            section = Section.objects.get(slug=section_slug)
            SectionMembership.objects.create(
                user=user,
                section=section,
                role=SectionMembership.Role.INSTRUCTOR,
                is_active=True,
            )
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin serializer for managing users."""

    profile = ProfileSerializer(read_only=True)
    is_locked = serializers.SerializerMethodField()
    lockout_remaining_minutes = serializers.SerializerMethodField()
    instructor_section = serializers.SerializerMethodField()
    student_sections = serializers.SerializerMethodField()
    section_slug = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'is_active', 'date_joined', 'profile', 'phone',
            'failed_login_attempts', 'locked_until', 'is_locked',
            'lockout_remaining_minutes', 'instructor_section', 'student_sections',
            'section_slug',
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'failed_login_attempts',
                            'locked_until', 'is_locked', 'lockout_remaining_minutes']

    def get_is_locked(self, obj):
        return obj.is_locked

    def get_lockout_remaining_minutes(self, obj):
        return obj.get_lockout_remaining_minutes()

    def get_instructor_section(self, obj):
        if obj.role != User.Role.INSTRUCTOR:
            return None
        from apps.sections.models import SectionMembership
        membership = (
            SectionMembership.objects
            .filter(user=obj, role=SectionMembership.Role.INSTRUCTOR, is_active=True)
            .select_related('section')
            .first()
        )
        if membership:
            return {'slug': membership.section.slug, 'name': membership.section.name}
        return None

    def get_student_sections(self, obj):
        if obj.role != User.Role.STUDENT:
            return []
        from apps.sections.models import SectionMembership
        memberships = (
            SectionMembership.objects
            .filter(user=obj, role=SectionMembership.Role.STUDENT, is_active=True)
            .select_related('section')
        )
        return [
            {'slug': m.section.slug, 'name': m.section.name}
            for m in memberships
            if m.section and m.section.is_active
        ]

    def update(self, instance, validated_data):
        section_slug = validated_data.pop('section_slug', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if section_slug is not None and instance.role == User.Role.INSTRUCTOR:
            self._assign_section(instance, section_slug)
        return instance

    def _assign_section(self, user, section_slug):
        from apps.sections.models import Section, SectionMembership
        request = self.context.get('request')
        granted_by = request.user if request else None

        if section_slug == '' or section_slug is None:
            SectionMembership.objects.filter(
                user=user, role=SectionMembership.Role.INSTRUCTOR
            ).update(is_active=False)
            from apps.courses.models import Course
            Course.objects.filter(instructor=user).update(section=None)
            return

        try:
            section = Section.objects.get(slug=section_slug)
        except Section.DoesNotExist:
            raise serializers.ValidationError(
                {'section_slug': f'No existe una sección con slug "{section_slug}".'}
            )

        SectionMembership.objects.filter(
            user=user, role=SectionMembership.Role.INSTRUCTOR
        ).exclude(section=section).update(is_active=False)

        SectionMembership.objects.update_or_create(
            user=user,
            section=section,
            defaults={
                'role': SectionMembership.Role.INSTRUCTOR,
                'is_active': True,
                'granted_by': granted_by,
            },
        )

        # Reasignar todos los cursos del instructor a la nueva sección
        from apps.courses.models import Course
        Course.objects.filter(instructor=user).update(section=section)


class AdminStudentCreateSerializer(serializers.ModelSerializer):
    """Admin-only serializer to create student accounts and assign them to sections."""

    password = serializers.CharField(write_only=True, min_length=PASSWORD_MIN_LENGTH)
    phone = serializers.CharField(required=True, max_length=20)
    section_slugs = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        write_only=True,
    )

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password', 'section_slugs']

    def _validate_name(self, value, label):
        value = (value or '').strip()
        if len(value) < NAME_MIN_LENGTH:
            raise serializers.ValidationError(f'{label} debe tener al menos {NAME_MIN_LENGTH} caracteres.')
        if not NAME_ONLY_LETTERS_PATTERN.match(value):
            raise serializers.ValidationError(f'{label} solo puede contener letras.')
        return value

    def validate_first_name(self, value):
        return self._validate_name(value, 'El nombre')

    def validate_last_name(self, value):
        return self._validate_name(value, 'El apellido')

    def validate_phone(self, value):
        value = (value or '').strip()
        if not PHONE_PATTERN.match(value):
            raise serializers.ValidationError('El teléfono debe tener exactamente 10 dígitos numéricos.')
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError('Este número de teléfono ya está registrado.')
        return value

    def validate_section_slugs(self, slugs):
        from apps.sections.models import Section
        valid = []
        for slug in slugs:
            if not Section.objects.filter(slug=slug, is_active=True).exists():
                raise serializers.ValidationError(f'No existe una sección activa con slug "{slug}".')
            valid.append(slug)
        return valid

    def create(self, validated_data):
        section_slugs = validated_data.pop('section_slugs', [])
        phone = validated_data.pop('phone')

        username = generate_unique_username(
            validated_data['first_name'],
            validated_data['last_name'],
        )

        try:
            user = User.objects.create_user(
                email=validated_data['email'],
                username=username,
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                phone=phone,
                password=validated_data['password'],
                role=User.Role.STUDENT,
            )
        except DjangoValidationError as e:
            msg = e.messages[0] if e.messages else str(e)
            raise serializers.ValidationError({'password': msg})

        Profile.objects.create(user=user)

        if section_slugs:
            from apps.sections.models import Section, SectionMembership
            request = self.context.get('request')
            granted_by = request.user if request else None
            for slug in section_slugs:
                section = Section.objects.get(slug=slug)
                SectionMembership.objects.create(
                    user=user,
                    section=section,
                    role=SectionMembership.Role.STUDENT,
                    granted_by=granted_by,
                    is_active=True,
                )

        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña por admin."""
    
    new_password = serializers.CharField(write_only=True, min_length=PASSWORD_MIN_LENGTH)
    
    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
