import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from products.models import Product

print(f'Total products: {Product.objects.count()}')
print(f'GPUs: {Product.objects.filter(category__slug="gpu").count()}')
print('\nFirst 5 GPUs:')
for p in Product.objects.filter(category__slug='gpu').order_by('-created_at')[:5]:
    print(f'- {p.name}')
    print(f'  Brand: {p.brand}, Price: ৳{p.min_price}')
    print(f'  Prices from {p.prices.count()} retailer(s)')
