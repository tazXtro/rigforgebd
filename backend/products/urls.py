"""
Product URL routing.
"""

from django.urls import path
from products.views import (
    ProductListView,
    ProductDetailView,
    RetailerListView,
    ProductIngestionView,
    CategoryCountsView,
    BrandsListView,
)

urlpatterns = [
    path("", ProductListView.as_view(), name="product-list"),
    path("categories/counts/", CategoryCountsView.as_view(), name="category-counts"),
    path("brands/", BrandsListView.as_view(), name="brands-list"),
    path("<uuid:product_id>/", ProductDetailView.as_view(), name="product-detail"),
    path("retailers/", RetailerListView.as_view(), name="retailer-list"),
    path("ingest/", ProductIngestionView.as_view(), name="product-ingest"),
]

