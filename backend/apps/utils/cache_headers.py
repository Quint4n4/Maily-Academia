"""
Cabeceras de cache para respuestas con datos personales.

Punto 18 de `security-checklist`: los datos personales no se cachean en el
navegador. Sin `Cache-Control: no-store`, el navegador o un proxy intermedio
pueden conservar la respuesta; en una computadora compartida, el siguiente que
pulse "atras" ve el perfil del anterior.

Ver docs/00-deuda.md, P1-6.
"""


class NoGuardarDatosPersonalesMiddleware:
    """
    Marca como no almacenable toda respuesta a una peticion autenticada.

    La regla es deliberadamente amplia: si la peticion trae credenciales, la
    respuesta es de alguien y no se guarda. Lo publico --catalogo, landing,
    academias-- sigue siendo cacheable porque se pide sin autenticacion.

    Preferimos equivocarnos hacia no cachear: con este volumen de trafico la
    cache no compra casi nada, y una fuga de perfil en una maquina compartida
    cuesta mucho mas.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        usuario = getattr(request, 'user', None)
        if usuario is not None and usuario.is_authenticated:
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
            response['Pragma'] = 'no-cache'   # para proxies viejos que ignoran Cache-Control

        return response
