/**
 * Server-side Products API with Next.js caching
 * 
 * This module uses native fetch() with Next.js caching for optimal performance:
 * - Automatic request deduplication
 * - ISR (Incremental Static Regeneration) with revalidation
 * - Reduced backend load on rapid refreshes
 * 
 * Use these functions in Server Components and Route Handlers.
 */

import { Product } from '@/components/products/ProductCard';

export interface ProductsQueryParams {
    category?: string;
    search?: string;
    brand?: string;
    sort?: string;
    page?: number;
    page_size?: number;
}

export interface PaginationInfo {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface PaginatedProductsResponse {
    products: Product[];
    pagination: PaginationInfo;
}

export interface Retailer {
    id: string;
    name: string;
    slug: string;
    base_url: string;
    is_active: boolean;
    product_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Fetch paginated products with Next.js caching
 * 
 * Caching strategy:
 * - Products are cached for 30 seconds (revalidate: 30)
 * - Search queries are not cached (dynamic)
 * - Category pages use ISR caching
 */
export async function fetchProductsServer(
    params?: ProductsQueryParams
): Promise<PaginatedProductsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.brand) searchParams.set('brand', params.brand);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    
    const query = searchParams.toString();
    const url = `${API_BASE}/products/${query ? `?${query}` : ''}`;
    
    // Use shorter cache for search queries, longer for category browsing
    const hasSearch = params?.search && params.search.length > 0;
    
    const response = await fetch(url, {
        next: {
            // Cache products for 30 seconds, or no-cache for search
            revalidate: hasSearch ? 0 : 30,
            // Tag for on-demand revalidation
            tags: ['products', params?.category ? `category-${params.category}` : 'all-products'],
        },
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
}

/**
 * Fetch category counts with aggressive caching
 * 
 * Category counts change infrequently, so we cache for 60 seconds.
 * This significantly reduces load during rapid page refreshes.
 */
export async function fetchCategoryCountsServer(): Promise<Record<string, number>> {
    const response = await fetch(`${API_BASE}/products/categories/counts/`, {
        next: {
            // Cache category counts for 60 seconds
            revalidate: 60,
            tags: ['category-counts'],
        },
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch category counts: ${response.status}`);
    }
    
    return response.json();
}

/**
 * Fetch retailers with caching
 * 
 * Retailer list rarely changes, cache for 5 minutes.
 */
export async function fetchRetailersServer(): Promise<Retailer[]> {
    const response = await fetch(`${API_BASE}/products/retailers/`, {
        next: {
            // Cache retailers for 5 minutes
            revalidate: 300,
            tags: ['retailers'],
        },
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch retailers: ${response.status}`);
    }
    
    return response.json();
}

/**
 * Fetch a single product by slug
 */
export async function fetchProductBySlugServer(
    categorySlug: string,
    productSlug: string
): Promise<Product | null> {
    // For single product, we could use a dedicated API endpoint
    // For now, fetch from category and filter
    const { products } = await fetchProductsServer({ 
        category: categorySlug, 
        page_size: 100 
    });
    return products.find(p => p.slug === productSlug) || null;
}
