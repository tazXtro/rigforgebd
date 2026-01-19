"""
Script to check GPU brands in the database.

This helps identify products that might have incorrect brand attribution.
For example, "MSI GeForce RTX 4090" should have brand="MSI", not brand="NVIDIA".
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from products.repositories.supabase import product_repository


def check_gpu_brands():
    """Check GPU products and their brands."""
    
    # Get all graphics card products
    products = product_repository.get_by_category("graphics-cards", limit=1000)
    
    print(f"\nTotal graphics cards: {len(products)}\n")
    
    # Group by brand
    brand_counts = {}
    brand_examples = {}
    
    for product in products:
        brand = product.get("brand", "Unknown")
        name = product.get("name", "")
        
        if brand not in brand_counts:
            brand_counts[brand] = 0
            brand_examples[brand] = []
        
        brand_counts[brand] += 1
        
        # Keep first 3 examples
        if len(brand_examples[brand]) < 3:
            brand_examples[brand].append(name)
    
    # Sort by count
    sorted_brands = sorted(brand_counts.items(), key=lambda x: x[1], reverse=True)
    
    print("Brand distribution in graphics cards:")
    print("=" * 80)
    for brand, count in sorted_brands:
        print(f"\n{brand}: {count} products")
        print("Examples:")
        for example in brand_examples[brand]:
            print(f"  - {example}")
    
    # Check for potential issues
    print("\n\n" + "=" * 80)
    print("POTENTIAL ISSUES:")
    print("=" * 80)
    
    # Find products with "NVIDIA" brand that might be MSI/ASUS/etc
    if "NVIDIA" in brand_counts or "nvidia" in brand_counts:
        nvidia_products = [p for p in products if p.get("brand", "").lower() == "nvidia"]
        print(f"\n⚠️  Found {len(nvidia_products)} products with brand='NVIDIA'")
        print("These might be reference cards, or they might need brand correction.")
        print("\nExamples:")
        for p in nvidia_products[:5]:
            name = p.get("name", "")
            # Check if name contains other manufacturer names
            manufacturers = ["MSI", "ASUS", "Gigabyte", "ZOTAC", "PNY", "EVGA", "Palit", "Gainward"]
            found_mfr = [m for m in manufacturers if m.lower() in name.lower()]
            if found_mfr:
                print(f"  ⚠️  '{name}' (contains: {', '.join(found_mfr)})")
            else:
                print(f"  ✓ '{name}' (likely reference card)")
    
    # Check for duplicate brands (case variations)
    brand_lower_map = {}
    for brand in brand_counts.keys():
        brand_lower = brand.lower()
        if brand_lower not in brand_lower_map:
            brand_lower_map[brand_lower] = []
        brand_lower_map[brand_lower].append(brand)
    
    duplicates = {k: v for k, v in brand_lower_map.items() if len(v) > 1}
    if duplicates:
        print(f"\n⚠️  Found case-sensitive duplicates:")
        for lower, variations in duplicates.items():
            print(f"  - {variations} (all variations of '{lower}')")


if __name__ == "__main__":
    check_gpu_brands()
