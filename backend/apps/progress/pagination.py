"""
Paginacion local de la app de progreso.

Por que existe: la paginacion global del proyecto
(`config/settings.py:156-157`) es `PageNumberPagination` con `PAGE_SIZE: 20` y
SIN `page_size_query_param`. Eso significa que DRF **ignora en silencio**
cualquier `?page_size=` que llegue.

La pantalla de cupones pide `page_size=1000` para calcular sus tres tarjetas de
estadisticas sobre la lista completa
(`cursos-maily/src/pages/admin/CouponManagement.jsx:155`). Sin esta clase, esa
llamada devuelve 20 filas y las tarjetas mienten sin dar ningun error.

La clase se aplica a UNA vista, no al proyecto. Cambiar el default global
alteraria el tamano de pagina de las 92 vistas del backend, varias de ellas en
produccion, por una pantalla.
"""
from rest_framework.pagination import PageNumberPagination


class PaginacionConTamanoPedido(PageNumberPagination):
    """Deja que el cliente pida el tamano de pagina, con techo.

    El techo no es decorativo: `django-backend` pide que todo listado venga
    acotado. Sin `max_page_size`, un `?page_size=1000000` serializa la tabla
    entera --con su M2M-- en el hilo de la peticion.
    """

    page_size_query_param = 'page_size'
    max_page_size = 200
