import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from products.models import Product

products_with_images = Product.objects.exclude(image='').count()
products_without_images = Product.objects.filter(image='').count()

print(f'Products with images: {products_with_images}')
print(f'Products without images: {products_without_images}')

print('\nSample product images:')
for p in Product.objects.exclude(image='')[:3]:
    print(f'- {p.name[:50]}...')
    print(f'  Image: {p.image}')
