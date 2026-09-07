from django.urls import path

from . import views

urlpatterns = [
    path('', views.BlogPostListCreateView.as_view(), name='blog-list-create'),
    path('<slug:slug>/', views.BlogPostDetailView.as_view(), name='blog-detail'),
]
