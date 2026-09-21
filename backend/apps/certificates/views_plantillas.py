"""
Plantillas de diploma: listar, crear duplicando, editar y previsualizar.

Aparte de `views.py` por el mismo motivo que `views_payments.py` en `progress`:
son dominios distintos que solo comparten la app.
"""

from pathlib import Path

from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdminOrInstructor

from .almacenamiento import (
    ErrorDeAlmacenamiento,
    ErrorDeImagen,
    borrar_imagen,
    subir_imagen,
    validar_imagen,
)
from .documento import documento_semilla
from .models import PlantillaDeDiploma, RecursoDeDiploma
from .pdf import dibujar_diploma
from .selectors import (
    plantilla_editable_o_404,
    plantilla_visible_o_404,
    plantillas_visibles_para,
    recurso_borrable_o_404,
    recursos_visibles_para,
)
from .serializers import PlantillaDeDiplomaSerializer, RecursoDeDiplomaSerializer
from .services import datos_de_ejemplo, resolver_recurso


class PlantillasView(generics.ListCreateAPIView):
    """
    GET  /api/diplomas/plantillas/  – las que este usuario puede usar
    POST /api/diplomas/plantillas/  – crear duplicando otra, o la semilla
    """

    serializer_class = PlantillaDeDiplomaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get_queryset(self):
        # AMBITO>> Plantillas de la plataforma, de sus academias y suyas.
        return plantillas_visibles_para(self.request.user).select_related('section', 'owner')

    def create(self, request, *args, **kwargs):
        """
        El cuerpo es `{"nombre": "...", "copiar_de": 7}`. `copiar_de` es
        opcional: sin el se parte de la semilla.

        El documento NO se acepta en la creacion. Se crea la plantilla y se
        edita con PATCH, que es el camino que valida. Aceptarlo aqui seria un
        segundo sitio donde validar, y el segundo sitio es el que se olvida.
        """
        nombre = (request.data.get('nombre') or '').strip()
        if not nombre:
            return Response(
                {'nombre': ['Ponle un nombre a la plantilla.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(nombre) > 120:
            return Response(
                {'nombre': ['El nombre no puede pasar de 120 caracteres.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        copiar_de = request.data.get('copiar_de')
        if copiar_de in (None, ''):
            documento = documento_semilla()
        else:
            # Pasa por el selector: copiar una plantilla exige poder verla. Sin
            # esto, un maestro se lleva el diseno de otra academia poniendo su id.
            documento = plantilla_visible_o_404(request.user, copiar_de).documento

        plantilla = PlantillaDeDiploma.objects.create(
            nombre=nombre,
            documento=documento,
            alcance=PlantillaDeDiploma.Alcance.INSTRUCTOR,
            owner=request.user,
        )
        datos = self.get_serializer(plantilla).data
        return Response(datos, status=status.HTTP_201_CREATED)


class PlantillaDetalleView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/diplomas/plantillas/{id}/
    PATCH  /api/diplomas/plantillas/{id}/  – guardar el documento
    DELETE /api/diplomas/plantillas/{id}/
    """

    serializer_class = PlantillaDeDiplomaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def get_object(self):
        # Leer y escribir no son el mismo permiso: un maestro ve la plantilla
        # de la plataforma y no puede reescribirla, porque su cambio saldria en
        # los diplomas de las tres academias.
        if self.request.method in ('PATCH', 'PUT', 'DELETE'):
            return plantilla_editable_o_404(self.request.user, self.kwargs['pk'])
        return plantilla_visible_o_404(self.request.user, self.kwargs['pk'])


class PlantillaPreviewView(APIView):
    """
    POST /api/diplomas/plantillas/{id}/preview/ – el PDF real, sin emitir nada.

    Es la pieza que hace que el editor funcione. El navegador mide el texto
    distinto a ReportLab, asi que un editor que PREDICE el PDF siempre miente un
    poco y la diferencia se descubre cuando el alumno ya descargo el diploma.
    Aqui lo dibuja el mismo codigo que emitira el documento de verdad.

    Acepta un `documento` en el cuerpo para previsualizar cambios sin guardar;
    sin el, usa el que esta guardado.
    """

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def post(self, request, pk):
        plantilla = plantilla_visible_o_404(request.user, pk)

        documento = request.data.get('documento')
        if documento is not None:
            serializer = PlantillaDeDiplomaSerializer(
                plantilla, data={'documento': documento},
                partial=True, context={'request': request},
            )
            serializer.is_valid(raise_exception=True)
            documento = serializer.validated_data['documento']
        else:
            documento = plantilla.documento

        respuesta = HttpResponse(content_type='application/pdf')
        respuesta['Content-Disposition'] = 'inline; filename="vista-previa.pdf"'
        # Sin esto la vista previa se queda pegada en el navegador y el maestro
        # cree que su cambio no se guardo.
        respuesta['Cache-Control'] = 'no-store'

        dibujar_diploma(
            respuesta, datos_de_ejemplo(), documento,
            resolver_recurso=resolver_recurso,
        )
        return respuesta


class RecursosView(generics.ListCreateAPIView):
    """
    GET  /api/diplomas/recursos/?tipo=marco  – la galeria visible
    POST /api/diplomas/recursos/             – subir una imagen (multipart)
    """

    serializer_class = RecursoDeDiplomaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInstructor]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        # AMBITO>> De la plataforma, de sus academias y suyas.
        consulta = recursos_visibles_para(self.request.user).select_related('section', 'owner')
        tipo = self.request.query_params.get('tipo')
        if tipo:
            consulta = consulta.filter(tipo=tipo)
        return consulta

    def create(self, request, *args, **kwargs):
        archivo = request.FILES.get('archivo')
        if archivo is None:
            return Response(
                {'archivo': ['Falta el archivo.']}, status=status.HTTP_400_BAD_REQUEST,
            )

        tipo = request.data.get('tipo')
        if tipo not in RecursoDeDiploma.Tipo.values:
            return Response(
                {'tipo': [f'Debe ser uno de {RecursoDeDiploma.Tipo.values}.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nombre = (request.data.get('nombre') or '').strip()
        if not nombre:
            nombre = Path(getattr(archivo, 'name', 'imagen')).stem[:120] or 'Imagen'

        # Se valida ANTES de que el archivo viaje a Cloudinary: subir primero y
        # preguntar despues gasta la cuota del plan con basura, y deja imagenes
        # huerfanas alla cuando la fila no llega a crearse.
        try:
            ancho, alto = validar_imagen(archivo)
        except ErrorDeImagen as e:
            return Response({'archivo': [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

        # Solo un administrador publica en la galeria de la plataforma. Si el
        # alcance lo eligiera el cliente, cualquier maestro llenaria la galeria
        # que ven las tres academias.
        es_admin = getattr(request.user, 'role', None) == 'admin' or request.user.is_superuser
        alcance = request.data.get('alcance')
        if not es_admin or alcance not in RecursoDeDiploma.Alcance.values:
            alcance = RecursoDeDiploma.Alcance.INSTRUCTOR

        try:
            public_id = subir_imagen(
                archivo, tipo=tipo,
                dueno_id=request.user.id if alcance == RecursoDeDiploma.Alcance.INSTRUCTOR else None,
            )
        except ErrorDeAlmacenamiento as e:
            return Response(
                {'archivo': [f'No se pudo guardar la imagen: {e}']},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        recurso = RecursoDeDiploma.objects.create(
            tipo=tipo,
            nombre=nombre,
            cloudinary_public_id=public_id,
            ancho_px=ancho,
            alto_px=alto,
            alcance=alcance,
            owner=request.user if alcance == RecursoDeDiploma.Alcance.INSTRUCTOR else None,
        )
        return Response(
            self.get_serializer(recurso).data, status=status.HTTP_201_CREATED,
        )


class RecursoDetalleView(APIView):
    """DELETE /api/diplomas/recursos/{id}/ – borrar uno propio."""

    permission_classes = [IsAuthenticated, IsAdminOrInstructor]

    def delete(self, request, pk):
        recurso = recurso_borrable_o_404(request.user, pk)
        borrar_imagen(recurso.cloudinary_public_id)
        recurso.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
