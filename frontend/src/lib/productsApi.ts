import api from './api';
import { Product } from '@/components/products/ProductCard';

export interface ProductsQueryParams {
    category?: string;
    search?: string;
    brand?: string;
    sort?: string;  // Sort option: newest, name_asc, name_desc, price_asc, price_desc
    min_price?: number;
    max_price?: number;
    retailers?: string;  // Comma-separated retailer slugs
    page?: number;
    page_size?: number;
    grouped?: boolean;  // If true, group all retailers under one product (for builder)
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

/**
 * Fetch paginated products from the API
 * 
 * Best practice: Server-side pagination reduces payload size
 * and initial load time significantly.
 */
export async function fetchProducts(params?: ProductsQueryParams): Promise<PaginatedProductsResponse> {
    const response = await api.get<PaginatedProductsResponse>('/products/', { params });
    return response.data;
}

/**
 * Fetch a single product by category and slug
 */
export async function fetchProductBySlug(
    categorySlug: string,
    productSlug: string
): Promise<Product | null> {
    const { products } = await fetchProducts({ category: categorySlug, page_size: 100 });
    return products.find(p => p.slug === productSlug) || null;
}

/**
 * Fetch product counts per category
 */
export async function fetchCategoryCounts(): Promise<Record<string, number>> {
    const response = await api.get<Record<string, number>>('/products/categories/counts/');
    return response.data;
}

/**
 * Retailer data with product count
 */
export interface Retailer {
    id: string;
    name: string;
    slug: string;
    base_url: string;
    is_active: boolean;
    product_count: number;
}

/**
 * Fetch all retailers with their product listing counts
 */
export async function fetchRetailers(): Promise<Retailer[]> {
    const response = await api.get<Retailer[]>('/products/retailers/');
    return response.data;
}

/**
 * Fetch available brands, optionally filtered by category
 */
export async function fetchBrands(category?: string): Promise<string[]> {
    const response = await api.get<string[]>('/products/brands/', {
        params: category ? { category } : undefined
    });
    return response.data;
}
