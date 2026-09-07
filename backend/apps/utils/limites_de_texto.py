"""
Limite por defecto para los campos de texto libre de la API.

Punto 14 de `security-checklist`: ningun campo de texto es ilimitado. Un
`TextField` de Django no lleva `max_length`, asi que su serializer tampoco, y la
API acepta lo que le manden. Medido el 2026-09-03: 1 MB en la descripcion de un
curso se guardaba con HTTP 201.

Sin limite, cualquiera con una cuenta de instructor puede llenar la base, y una
descripcion de varios megas se sirve despues en cada listado.

El limite se aplica en el SERIALIZER y no en el modelo a proposito: cambiar el
modelo pide migracion, y en este repo las migraciones las corre solo Emanuel
(`verificadores.migraciones: solo-emanuel` en el perfil). Esto protege la via por
la que entran los datos --la API-- sin tocar el esquema.

Ver docs/00-deuda.md, P1-3.
"""
from django.core.validators import MaxLengthValidator
from rest_framework import serializers

# 20 000 caracteres son unas 8 paginas. Ninguna descripcion de curso legitima se
# acerca; la mas larga del seed no pasa de 200.
LIMITE_TEXTO_LARGO = 20_000


class LimitaTextoLibreMixin:
    """
    Pone un tope a los campos de texto que no declaren uno.

    Se mezcla en un ModelSerializer y recorre sus campos al construirse: a todo
    `CharField` de DRF sin `max_length` le asigna `LIMITE_TEXTO_LARGO`. Los campos
    que ya traen limite del modelo --`title` con `max_length=255`, por ejemplo--
    se quedan como estan.

    Al ser automatico, un campo nuevo queda protegido sin que nadie se acuerde.
    """

    limite_de_texto = LIMITE_TEXTO_LARGO

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for campo in self.fields.values():
            es_texto = isinstance(campo, serializers.CharField)
            if es_texto and campo.max_length is None and not campo.read_only:
                # Asignar campo.max_length despues de construir el campo NO agrega
                # el validador: DRF los arma en el __init__ del CharField. Hay que
                # anadirlo a mano.
                campo.max_length = self.limite_de_texto
                campo.validators.append(
                    MaxLengthValidator(
                        self.limite_de_texto,
                        message=(
                            f'Este campo no puede superar los {self.limite_de_texto:,} '
                            'caracteres.'
                        ).replace(',', ' '),
                    )
                )
