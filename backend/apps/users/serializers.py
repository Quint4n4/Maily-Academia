import re
import unicodedata

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Profile

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
    class Meta:
        model = Profile
        fields = ['bio', 'phone', 'avatar']


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

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password', 'password_confirm']

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
        Profile.objects.create(user=user)
        return user


class MeSerializer(serializers.ModelSerializer):
    """Serializer for the authenticated user to view/edit their own data."""

    profile = ProfileSerializer()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'date_joined', 'profile',
        ]
        read_only_fields = ['id', 'email', 'role', 'date_joined']

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


class InstructorCreateSerializer(serializers.ModelSerializer):
    """Admin-only serializer to create instructor accounts."""

    password = serializers.CharField(write_only=True, min_length=PASSWORD_MIN_LENGTH)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password']

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
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin serializer for managing users."""

    profile = ProfileSerializer(read_only=True)
    is_locked = serializers.SerializerMethodField()
    lockout_remaining_minutes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'is_active', 'date_joined', 'profile', 'phone',
            'failed_login_attempts', 'locked_until', 'is_locked',
            'lockout_remaining_minutes',
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'failed_login_attempts', 
                           'locked_until', 'is_locked', 'lockout_remaining_minutes']

    def get_is_locked(self, obj):
        return obj.is_locked

    def get_lockout_remaining_minutes(self, obj):
        return obj.get_lockout_remaining_minutes()


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
