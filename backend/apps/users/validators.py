"""
Custom password validators for Maily Academia.
"""
import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class ComplexityPasswordValidator:
    """
    Validate that the password contains at least one uppercase letter,
    one lowercase letter, one digit, and one special character.
    """

    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _('La contraseña debe contener al menos una letra mayúscula.'),
                code='password_no_upper',
            )
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _('La contraseña debe contener al menos una letra minúscula.'),
                code='password_no_lower',
            )
        if not re.search(r'\d', password):
            raise ValidationError(
                _('La contraseña debe contener al menos un número.'),
                code='password_no_digit',
            )
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
            raise ValidationError(
                _('La contraseña debe contener al menos un carácter especial (!@#$%^&* etc.).'),
                code='password_no_special',
            )

    def get_help_text(self):
        return _(
            'Su contraseña debe contener al menos una mayúscula, una minúscula, '
            'un número y un carácter especial.'
        )
