"""
CRUD de cupones para el panel de administracion.

    GET    /api/admin/coupons/       listado paginado, con filtros
    POST   /api/admin/coupons/       alta
    PATCH  /api/admin/coupons/{id}/  edicion, y tambien activar/desactivar
    DELETE /api/admin/coupons/{id}/  baja

El contrato de este modulo no salio de una cabeza: el modelo `Coupon` ya existia
completo (`apps/progress/models.py:177`) y la pantalla ya estaba escrita
(`cursos-maily/src/pages/admin/CouponManagement.jsx` y `CouponFormModal.jsx`),
llamando a endpoints que devolvian 404. Lo que esas dos fuentes dicen es lo que
hay aqui. Nada mas.

Forma de las vistas: `generics.*` + `path()`, como declara
`backend.forma_de_vistas: apiview-y-path` en el perfil del repo. Sin ViewSets y
sin routers.
"""
from rest_framework import generics, status
from rest_framework.request import Request
from rest_framework.response import Response

from apps.users.permissions import IsAdmin

from .pagination import PaginacionConTamanoPedido
from .selectors import cupon_o_404, cupones_para_admin
from .serializers import (
    CouponAdminSerializer,
    CouponCreateSerializer,
    CouponUpdateSerializer,
)
from .services import cupon_actualizar, cupon_crear, cupon_eliminar


class AdminCouponListCreateView(generics.ListCreateAPIView):
    """GET y POST /api/admin/coupons/ — solo administradores."""

    # Explicito a proposito: heredar el default de `settings.py`
    # (`IsAuthenticated`) dejaria este listado abierto a cualquier alumno con
    # sesion, y heredar no es una decision, es un descuido que se ve igual.
    permission_classes = [IsAdmin]
    pagination_class = PaginacionConTamanoPedido

    # Los tres filtros que manda la pantalla. `search` es `icontains` sobre el
    # codigo (`SearchFilter`, backend por defecto del proyecto); Django escapa
    # el `%` en el LIKE, asi que un `%` del usuario busca un `%`, no todo.
    filterset_fields = ['is_active', 'discount_type']
    search_fields = ['code']

    def get_queryset(self):
        return cupones_para_admin()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CouponCreateSerializer
        return CouponAdminSerializer

    def create(self, request: Request, *args, **kwargs) -> Response:
        entrada = CouponCreateSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        # `created_by` sale de la sesion, nunca del cuerpo.
        cupon = cupon_crear(datos=entrada.validated_data, actor=request.user)

        return Response(
            CouponAdminSerializer(cupon).data,
            status=status.HTTP_201_CREATED,
        )


class AdminCouponDetailView(generics.GenericAPIView):
    """PATCH y DELETE /api/admin/coupons/{id}/ — solo administradores.

    Solo esos dos metodos. El contrato de la pantalla no pide GET de detalle ni
    PUT, y un endpoint que nadie llama es un endpoint que nadie mantiene: los
    dos responden 405.
    """

    permission_classes = [IsAdmin]
    serializer_class = CouponUpdateSerializer

    def get_object(self):
        # Lectura por id a traves del selector. Un `objects.get()` aqui es como
        # se cuela un acceso sin filtrar el dia que este modelo tenga ambito.
        return cupon_o_404(self.kwargs['pk'])

    def patch(self, request: Request, *args, **kwargs) -> Response:
        cupon = self.get_object()

        entrada = CouponUpdateSerializer(instance=cupon, data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        cupon = cupon_actualizar(cupon=cupon, datos=entrada.validated_data)

        return Response(CouponAdminSerializer(cupon).data)

    def delete(self, request: Request, *args, **kwargs) -> Response:
        cupon_eliminar(cupon=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)
