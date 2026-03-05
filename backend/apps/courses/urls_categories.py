from django.urls import path

from . import views

urlpatterns = [
    # Categorías públicas
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('categories/<slug:slug>/', views.CategoryDetailView.as_view(), name='category-detail'),
    # Administración de categorías (solo admin global)
    path('admin/categories/', views.AdminCategoryListCreateView.as_view(), name='admin-category-list'),
    path('admin/categories/<slug:slug>/', views.AdminCategoryDetailView.as_view(), name='admin-category-detail'),
]

