from django.contrib import admin
from .models import Category, Retailer, Product, ProductPrice, GPUSpecification, ScrapeLog


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Retailer)
class RetailerAdmin(admin.ModelAdmin):
    list_display = ['name', 'website', 'is_active', 'created_at']
    list_filter = ['is_active']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


class ProductPriceInline(admin.TabularInline):
    model = ProductPrice
    extra = 0
    readonly_fields = ['last_checked', 'created_at']


class GPUSpecificationInline(admin.StackedInline):
    model = GPUSpecification
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'category', 'min_price', 'is_active', 'created_at']
    list_filter = ['category', 'brand', 'is_active']
    search_fields = ['name', 'brand', 'model']
    inlines = [ProductPriceInline, GPUSpecificationInline]
    readonly_fields = ['min_price', 'max_price', 'created_at', 'updated_at']


@admin.register(ProductPrice)
class ProductPriceAdmin(admin.ModelAdmin):
    list_display = ['product', 'retailer', 'price', 'availability', 'is_available', 'last_checked']
    list_filter = ['retailer', 'availability', 'is_available']
    search_fields = ['product__name']
    readonly_fields = ['last_checked', 'created_at', 'updated_at']


@admin.register(ScrapeLog)
class ScrapeLogAdmin(admin.ModelAdmin):
    list_display = ['retailer', 'category', 'status', 'products_found', 'products_created', 'started_at']
    list_filter = ['retailer', 'category', 'status']
    readonly_fields = ['started_at', 'completed_at']
