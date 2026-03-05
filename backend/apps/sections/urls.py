from django.urls import path

from . import views

app_name = 'sections'

urlpatterns = [
    # Endpoints públicos
    path('sections/', views.SectionListView.as_view(), name='section-list'),
    path('sections/my-sections/', views.MySectionsView.as_view(), name='my-sections'),
    path('sections/<slug:slug>/', views.SectionDetailView.as_view(), name='section-detail'),
    path('sections/<slug:slug>/preview/', views.SectionPreviewCoursesView.as_view(), name='section-preview'),

    # Endpoints autenticados por sección
    path('sections/<slug:slug>/courses/', views.SectionCoursesView.as_view(), name='section-courses'),

    # Videos de promoción (público)
    path('sections/<slug:slug>/promo-videos/', views.SectionPromoVideosView.as_view(), name='section-promo-videos'),

    # Endpoints de administración de membresías de sección
    path(
        'admin/sections/<slug:slug>/members/',
        views.SectionMembersListCreateView.as_view(),
        name='section-members',
    ),
    path(
        'admin/sections/<slug:slug>/members/<int:user_id>/',
        views.SectionMemberDetailView.as_view(),
        name='section-member-detail',
    ),
    # Administración de videos de promoción (super-admin)
    path(
        'admin/sections/<slug:slug>/promo-videos/',
        views.PromoVideoAdminListCreateView.as_view(),
        name='promo-video-list-create',
    ),
    path(
        'admin/sections/<slug:slug>/promo-videos/<int:pk>/',
        views.PromoVideoAdminDetailView.as_view(),
        name='promo-video-detail',
    ),
]

