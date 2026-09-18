"""
Servicios de la app de usuarios.

Nace con "entrar con Google". Trae tambien `datos_de_sesion`, que estaba
incrustado dentro de `SecureLoginView`: entrar por Google tiene que devolver
EXACTAMENTE la misma forma que entrar con contrasena, porque el frontend lee una
sola --`AuthContext.login`--. Duplicar ese calculo era garantizar que un dia las
dos puertas dejaran al usuario en academias distintas.
"""
from django.conf import settings
from django.db import transaction
from google.auth.transport import requests as transporte_google
from google.oauth2 import id_token
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, User

# Los dos valores que Google usa como emisor. La documentacion dice que este
# campo hay que comprobarlo a mano: `verify_oauth2_token` no lo mira.
EMISORES_VALIDOS = ('accounts.google.com', 'https://accounts.google.com')


class ErrorDeGoogle(Exception):
    """
    No se pudo entrar. El texto de estas SI se le ensena al usuario, porque lo
    escribimos nosotros y le dice algo util.
    """


class TokenInvalido(ErrorDeGoogle):
    """
    El token no paso la verificacion, o el servidor no esta configurado.

    Su texto NO se ensena: viene de la libreria de Google o describe el estado
    del servidor. La vista lo manda al registro y responde algo generico. Mismo
    motivo por el que la descarga de materiales no devuelve `str(e)`: ese texto
    acabo filtrando rutas del contenedor.
    """


# ---------------------------------------------------------------------------
# Sesion
# ---------------------------------------------------------------------------

def datos_de_sesion(user: User) -> dict:
    """
    Las secciones del usuario y a cual mandarlo, como los espera el frontend.

    AMBITO>> aqui se decide a que academias pertenece alguien. Longevity 360 se
    anade a todo el mundo porque es la academia publica; las otras dos salen de
    `SectionMembership` activa. Si esto se relaja, un alumno acaba viendo una
    academia que no es la suya.
    """
    from apps.sections.models import Section, SectionMembership

    memberships = (
        SectionMembership.objects.select_related('section')
        .filter(user=user, is_active=True)
    )

    section_slugs = []
    has_corporate = False
    has_maily = False

    for membership in memberships:
        section = membership.section
        if not section or not section.is_active:
            continue
        section_slugs.append(section.slug)
        if section.section_type == Section.SectionType.CORPORATE:
            has_corporate = True
        elif section.section_type == Section.SectionType.MAILY:
            has_maily = True

    # Longevity 360 es publico: todos los estudiantes tienen acceso.
    section_slugs.append('longevity-360')

    if has_corporate:
        redirect_section = 'corporativo-camsa'
    elif has_maily:
        redirect_section = 'maily-academia'
    else:
        redirect_section = 'longevity-360'

    # Superusers y staff se exponen como 'admin' para el frontend.
    effective_role = 'admin' if (user.is_superuser or user.is_staff) else user.role

    return {
        'redirect_section': redirect_section,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': effective_role,
            'is_super_admin': getattr(user, 'is_super_admin', False),
            'sections': sorted(set(section_slugs)),
        },
    }


def tokens_para(user: User) -> dict:
    """
    El par de tokens que devuelve el login normal.

    No hay serializer de token personalizado en el proyecto, asi que
    `RefreshToken.for_user` produce lo mismo que `/api/auth/login/`. Si algun dia
    se le anaden claims al token, hay que pasar por aqui tambien o entrar por
    Google dara un token distinto al de entrar con contrasena.
    """
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


# ---------------------------------------------------------------------------
# Entrar con Google
# ---------------------------------------------------------------------------

def _verificar_token(credential: str) -> dict:
    """
    Comprueba que el token lo firmo Google y venia dirigido a ESTA app.

    `verify_oauth2_token` valida tres cosas: la firma contra las claves publicas
    de Google --que rotan, por eso se descargan--, el `aud` y el `exp`.

    El `aud` es la comprobacion que impide el ataque obvio: sin ella, cualquiera
    monta una web con su propio cliente de Google, recoge el token que su usuario
    le firma, lo manda aqui y entra. El token seria autentico; lo que no seria es
    para nosotros.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise TokenInvalido('GOOGLE_CLIENT_ID no está configurado en el servidor.')

    try:
        datos = id_token.verify_oauth2_token(
            credential,
            transporte_google.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as e:  # la libreria lanza ValueError para todo
        raise TokenInvalido(str(e)) from e

    if datos.get('iss') not in EMISORES_VALIDOS:
        raise TokenInvalido('El token no lo emitió Google.')

    return datos


def _nombre_de_usuario(datos: dict, correo: str) -> str:
    """Un username legible a partir de lo que mande Google, o del correo."""
    from .serializers import generate_unique_username

    nombre = (datos.get('given_name') or '').strip()
    apellido = (datos.get('family_name') or '').strip()

    candidato = generate_unique_username(nombre, apellido)
    # `generate_unique_username` borra todo lo que no sea a-z0-9_, asi que un
    # nombre en otro alfabeto puede quedarse en '_' o en nada. El correo es el
    # respaldo: existe siempre y es unico.
    if candidato.strip('_0123456789') == '':
        candidato = generate_unique_username(correo.split('@')[0], '')
    return candidato


def _crear_usuario(datos: dict, sub: str, correo: str) -> User:
    """
    Alta nueva desde Google. Estudiante, sin telefono y sin contrasena usable.

    Sin contrasena usable a proposito: nadie ha elegido una, asi que no debe
    haber uno que adivinar. Quien quiera entrar tambien con contrasena tiene el
    flujo de "olvidé mi contraseña", que verifica el correo igual.

    Queda en Longevity 360, que es la academia publica -- exactamente donde cae
    hoy quien se registra con el formulario. Decidido por Emanuel el 2026-09-18.
    """
    usuario = User.objects.create_user(
        email=correo,
        username=_nombre_de_usuario(datos, correo),
        first_name=(datos.get('given_name') or '').strip(),
        last_name=(datos.get('family_name') or '').strip(),
        role=User.Role.STUDENT,
        google_sub=sub,
        phone=None,
    )
    # `create_user` sin contrasena ya deja el hash inutilizable; explicito para
    # que no dependa de un detalle de Django.
    usuario.set_unusable_password()
    usuario.save(update_fields=['password'])

    Profile.objects.create(user=usuario, avatar=(datos.get('picture') or ''))
    return usuario


@transaction.atomic
def entrar_con_google(credential: str) -> tuple[User, bool]:
    """
    Del token de Google a un usuario de Maily. Devuelve (usuario, es_nuevo).

    El vinculo se busca en este orden:

      1. Por `google_sub`, que es estable aunque el usuario cambie de correo.
      2. Por correo, y entonces se enlazan las dos cuentas. Esto es lo que hace
         que quien ya tenia cuenta con contrasena pueda entrar con Google sin
         acabar con dos cuentas y los cursos repartidos entre ambas.
      3. Si no hay nadie, se da de alta.

    El paso 2 solo ocurre con `email_verified` en true. Es el agujero clasico de
    este flujo: sin esa condicion, quien consiga un token para una direccion sin
    verificar entra en la cuenta de quien use esa direccion aqui.
    """
    datos = _verificar_token(credential)

    sub = datos.get('sub')
    correo = (datos.get('email') or '').strip().lower()
    if not sub or not correo:
        raise TokenInvalido('El token no trae identificador o correo.')

    if datos.get('email_verified') is not True:
        raise ErrorDeGoogle('Google no ha verificado ese correo.')

    es_nuevo = False
    usuario = User.objects.filter(google_sub=sub).first()

    if usuario is None:
        usuario = User.objects.filter(email__iexact=correo).first()
        if usuario is not None:
            usuario.google_sub = sub
            usuario.save(update_fields=['google_sub'])

    if usuario is None:
        usuario = _crear_usuario(datos, sub, correo)
        es_nuevo = True

    if not usuario.is_active:
        raise ErrorDeGoogle('La cuenta está desactivada.')

    # El bloqueo por intentos fallidos NO corta esta puerta, y se limpia al
    # entrar. Ese bloqueo existe para frenar a quien adivina contrasenas, y aqui
    # no se usa ninguna. Respetarlo convertiria una defensa contra fuerza bruta
    # en una forma de dejar fuera al usuario legitimo: basta con fallar cinco
    # veces contra su correo para tumbarle tambien el boton de Google.
    if usuario.failed_login_attempts or usuario.locked_until:
        usuario.reset_login_attempts()

    return usuario, es_nuevo
