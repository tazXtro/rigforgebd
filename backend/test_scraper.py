"""
Quick test script to check if we can scrape the websites
"""
import requests
from bs4 import BeautifulSoup

def test_techland():
    print("Testing Techland...")
    url = "https://www.techlandbd.com/pc-components/graphics-card"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Try different selectors
    products = soup.select('.product-layout')
    print(f"Found {len(products)} products with '.product-layout'")
    
    if not products:
        products = soup.select('.product-thumb')
        print(f"Found {len(products)} products with '.product-thumb'")
    
    if not products:
        products = soup.select('.product-grid .product-item')
        print(f"Found {len(products)} products with '.product-grid .product-item'")
    
    if products:
        print("\nFirst product HTML (truncated):")
        print(str(products[0])[:500])
    else:
        print("\nNo products found. Page might use JavaScript rendering.")
        print("Checking if page has content...")
        print(f"Page length: {len(response.text)} chars")
        # Check for common e-commerce patterns
        if 'product' in response.text.lower():
            print("Page contains 'product' text - might need different selectors")

def test_startech():
    print("\n\nTesting Star Tech...")
    url = "https://www.startech.com.bd/component/graphics-card"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Try different selectors
    products = soup.select('.p-item')
    print(f"Found {len(products)} products with '.p-item'")
    
    if not products:
        products = soup.select('.product-item')
        print(f"Found {len(products)} products with '.product-item'")
    
    if not products:
        products = soup.select('.main-content .product')
        print(f"Found {len(products)} products with '.main-content .product'")
    
    if products:
        print("\nFirst product HTML (truncated):")
        print(str(products[0])[:500])
    else:
        print("\nNo products found. Page might use JavaScript rendering.")
        print(f"Page length: {len(response.text)} chars")

if __name__ == '__main__':
    test_techland()
    test_startech()
