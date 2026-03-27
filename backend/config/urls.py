"""Root URL configuration for Maily Academia."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/users/', include('apps.users.urls_admin')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/materials/', include('apps.courses.urls_materials')),
    path('api/', include('apps.courses.urls_categories')),
    path('api/', include('apps.sections.urls')),
    path('api/', include('apps.quizzes.urls')),
    path('api/', include('apps.progress.urls')),
    path('api/', include('apps.qna.urls')),
    path('api/blog/', include('apps.blog.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
    path('api/payments/', include('apps.progress.urls_payments')),
    path('api/instructor/', include('apps.progress.urls_instructor')),
    path('api/corporate/', include('apps.corporate.urls')),
    path('api/admin/corporate/', include('apps.corporate.urls_admin')),
    # API documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
