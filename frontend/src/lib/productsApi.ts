import api from './api';
import { Product } from '@/components/products/ProductCard';

export interface ProductsQueryParams {
    category?: string;
    search?: string;
    brand?: string;
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

