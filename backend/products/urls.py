from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    # Categories and Retailers
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('retailers/', views.RetailerListView.as_view(), name='retailer-list'),
    
    # Products
    path('', views.ProductListView.as_view(), name='product-list'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
    
    # GPU-specific endpoints
    path('gpus/', views.GPUListView.as_view(), name='gpu-list'),
    path('gpus/filters/', views.GPUFiltersView.as_view(), name='gpu-filters'),
    
    # Admin endpoints
    path('scrape/', views.TriggerScrapeView.as_view(), name='trigger-scrape'),
]
