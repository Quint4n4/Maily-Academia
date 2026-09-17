"""
Selectores de la app de progreso: la puerta unica por la que se leen sus
registros.

`django-backend` no deja margen:

    Toda lectura por id vive en un selector. Un Model.objects.get(id=...) en la
    vista es la forma canonica de saltarse el filtro de ambito.

Este archivo nace con los cupones. El resto de la app todavia lee desde la
vista (`views.py`, `views_payments.py`); se ira moviendo aqui conforme se
toque cada endpoint, no de golpe.
"""
from datetime import timedelta

from django.db.models import Count, Max, Q, QuerySet
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek, TruncYear
from django.http import Http404
from django.utils import timezone

from .models import Coupon, LessonProgress, Purchase


def cupones_para_admin() -> QuerySet[Coupon]:
    """
    Listado base de cupones para el panel de administracion.

    El `prefetch_related` no es cosmetico: `applicable_courses` es M2M y el
    serializer la expone como lista de ids. Sin el, un listado de 20 cupones
    dispara 21 consultas. Con el, 2. Hay un test que cuenta las consultas para
    que un N+1 futuro rompa la suite y no la pantalla.

    El desempate por `-id` esta porque `created_at` es `auto_now_add` y dos
    cupones creados en la misma peticion pueden empatar; sin desempate, la
    paginacion puede repetir o saltarse una fila entre paginas.

    `last_used_at` se DERIVA aqui, no es una columna. Decidido por Emanuel el
    2026-09-17: la pantalla lo pide
    (`cursos-maily/src/pages/admin/CouponManagement.jsx:158`) y anadirlo al
    modelo seria una migracion. Se calcula como la fecha de la ultima compra
    **completada** que uso el cupon.

    Es un `Max` con `filter`, o sea un JOIN agregado dentro de la MISMA
    consulta: no anade una query por cupon. Hacerlo en un
    `SerializerMethodField` que consulte por fila seria el N+1 que el test de
    conteo existe para impedir.

    Se usa `paid_at` porque es la fecha canonica de venta en el resto del
    backend (`views_admin_analytics.py:106`, `views.py:34`). Una compra
    completada sin `paid_at` --no la produce el flujo de cobro, que escribe esa
    fecha en `views_payments.py:272`-- quedaria fuera del maximo.

    Cuenta COMPLETED y REFUNDED, y deja fuera PENDING y FAILED. La razon es que
    mida lo MISMO que `times_used`: el contador sube cuando el cobro entra y no
    baja al reembolsar, asi que un reembolso sigue siendo un uso gastado. Si un
    dia se decide que reembolsar devuelve el uso, hay que cambiar las dos cosas
    a la vez o la pantalla volvera a mostrar dos numeros que no cuadran.

    AMBITO>> `Coupon` NO tiene campo de academia y este endpoint es solo-admin,
    que ve las tres. El ambito de un cupon solo seria derivable por
    `applicable_courses`, y eso es una decision de diseno pendiente
    --documentada en `.claude/PERFIL-DEL-REPO.md` seccion 2--, no algo que
    resuelva este selector por su cuenta.
    """
    return (
        Coupon.objects
        .prefetch_related('applicable_courses')
        .annotate(
            last_used_at=Max(
                'purchases__paid_at',
                filter=Q(purchases__status__in=[
                    Purchase.Status.COMPLETED,
                    Purchase.Status.REFUNDED,
                ]),
            ),
        )
        .order_by('-created_at', '-id')
    )


def cupon_o_404(pk: int) -> Coupon:
    """Un cupon por id, o 404. Nunca `objects.get()` en la vista."""
    try:
        return cupones_para_admin().get(pk=pk)
    except Coupon.DoesNotExist:
        raise Http404('Cupón no encontrado.')


# ---------------------------------------------------------------------------
# Vistas de curso del panel del profesor
# ---------------------------------------------------------------------------

PERIODOS = {
    'day': {'trunc': TruncDay, 'dias': 30, 'formato': '%d %b'},
    'week': {'trunc': TruncWeek, 'dias': 7 * 12, 'formato': 'Sem %d %b'},
    'month': {'trunc': TruncMonth, 'dias': 365, 'formato': '%b %Y'},
    'year': {'trunc': TruncYear, 'dias': 365 * 5, 'formato': '%Y'},
}


def _progreso_de_los_cursos_de(instructor) -> QuerySet:
    """
    Filas de progreso de las lecciones de los cursos de ESTE instructor.

    Que es una "vista": el backend crea una fila de `LessonProgress` en cuanto
    el alumno reproduce el video de una leccion --`LessonPositionUpdateView` la
    crea con `completed=False` al guardar la posicion-- y tambien al
    completarla. O sea, la fila existe desde que el alumno empieza a consumir la
    leccion, que es la señal mas cercana a "la vio" que hay en esta base.

    Lo que NO mide: quien abre la ficha publica de un curso sin estar inscrito.
    Eso no lo registra nadie hoy.

    Ojo con la fecha: se agrupa por `completed_at`, que es `auto_now_add` y por
    tanto marca la PRIMERA vez que el alumno toco la leccion, no la ultima. La
    serie cuenta entonces alumnos que EMPEZARON algo en el periodo, no visitas
    repetidas.

    AMBITO>> el filtro por `instructor` es lo unico que separa los cursos de un
    profesor de los de otro: `LessonProgress` no tiene campo de academia y su
    ambito se deriva recorriendo leccion -> modulo -> curso. Si este filtro
    desaparece, un profesor ve la actividad de los cursos de los demas.
    """
    return LessonProgress.objects.filter(
        lesson__module__course__instructor=instructor,
    )


def serie_de_alumnos_por_periodo(instructor, periodo: str = 'month') -> list[dict]:
    """Alumnos UNICOS con actividad, agrupados por dia, semana, mes o año."""
    cfg = PERIODOS.get(periodo, PERIODOS['month'])
    desde = timezone.now() - timedelta(days=cfg['dias'])

    filas = (
        _progreso_de_los_cursos_de(instructor)
        .filter(completed_at__gte=desde)
        .annotate(bloque=cfg['trunc']('completed_at'))
        .values('bloque')
        # `distinct=True` es el punto entero de esta consulta: sin el, un alumno
        # que vio ocho lecciones cuenta como ocho alumnos.
        .annotate(alumnos=Count('user', distinct=True))
        .order_by('bloque')
    )
    return [
        {'label': f['bloque'].strftime(cfg['formato']), 'alumnos': f['alumnos']}
        for f in filas if f['bloque']
    ]


def cursos_mas_vistos(instructor, periodo: str = 'month', limite: int = 5) -> list[dict]:
    """Ranking de cursos por alumnos unicos con actividad en el periodo."""
    cfg = PERIODOS.get(periodo, PERIODOS['month'])
    desde = timezone.now() - timedelta(days=cfg['dias'])

    filas = (
        _progreso_de_los_cursos_de(instructor)
        .filter(completed_at__gte=desde)
        .values('lesson__module__course__id', 'lesson__module__course__title')
        .annotate(alumnos=Count('user', distinct=True))
        .order_by('-alumnos', 'lesson__module__course__title')[:limite]
    )
    return [
        {
            'course_id': f['lesson__module__course__id'],
            'title': f['lesson__module__course__title'],
            'alumnos': f['alumnos'],
        }
        for f in filas
    ]


def total_de_alumnos_que_ven(instructor, periodo: str = 'month') -> int:
    """Alumnos unicos en TODO el periodo, sin agrupar por bloque."""
    cfg = PERIODOS.get(periodo, PERIODOS['month'])
    desde = timezone.now() - timedelta(days=cfg['dias'])
    return (
        _progreso_de_los_cursos_de(instructor)
        .filter(completed_at__gte=desde)
        .values('user')
        .distinct()
        .count()
    )
