import api from './api';
import { Product } from '@/components/products/ProductCard';

export interface ProductsQueryParams {
    category?: string;
    search?: string;
    brand?: string;
    sort?: string;  // Sort option: newest, name_asc, name_desc, price_asc, price_desc
    cpu_id?: string;
    motherboard_id?: string;
    compat_mode?: "strict" | "lenient";
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

// ============================================================================
// Compatibility API
// ============================================================================

/**
 * Response from compatibility API endpoints
 */
export interface CompatibilityResponse {
    cpu?: {
        id: string;
        socket: string;
        brand?: string;
        generation?: string;
    };
    motherboard?: {
        id: string;
        memory_type: string;
        max_speed_mhz?: number;
        max_capacity_gb?: number;
        slots?: number;
    };
    mode: 'strict' | 'lenient';
    compatible: string[];  // Product IDs that are compatible
    unknown: string[];     // Product IDs with unknown compatibility (for lenient mode)
    error?: string;
}

/**
 * Fetch compatible motherboard IDs for a given CPU
 * 
 * @param cpuId - The product ID of the selected CPU
 * @param mode - 'strict' returns only confident matches, 'lenient' includes unknown
 */
export async function fetchCompatibleMotherboards(
    cpuId: string,
    mode: 'strict' | 'lenient' = 'strict'
): Promise<CompatibilityResponse> {
    try {
        const response = await api.get<CompatibilityResponse>('/products/compatible/', {
            params: { cpu_id: cpuId, mode }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching compatible motherboards:', error);
        return {
            mode,
            compatible: [],
            unknown: [],
            error: 'Failed to fetch compatibility data'
        };
    }
}

/**
 * Fetch compatible RAM IDs for a given motherboard
 * 
 * @param motherboardId - The product ID of the selected motherboard
 * @param mode - 'strict' returns only confident matches, 'lenient' includes unknown
 */
export async function fetchCompatibleRAM(
    motherboardId: string,
    mode: 'strict' | 'lenient' = 'strict'
): Promise<CompatibilityResponse> {
    try {
        const response = await api.get<CompatibilityResponse>('/products/compatible/', {
            params: { motherboard_id: motherboardId, mode }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching compatible RAM:', error);
        return {
            mode,
            compatible: [],
            unknown: [],
            error: 'Failed to fetch compatibility data'
        };
    }
}

/**
 * Fetch compatibility info for a specific product
 */
export interface ProductCompatibilityInfo {
    id: string;
    product_id: string;
    component_type: 'cpu' | 'motherboard' | 'ram';
    cpu_socket?: string;
    cpu_brand?: string;
    cpu_generation?: string;
    mobo_socket?: string;
    mobo_chipset?: string;
    memory_type?: string;
    memory_slots?: number;
    memory_max_speed_mhz?: number;
    memory_max_capacity_gb?: number;
    confidence: number;
    extraction_source: string;
}

export async function fetchProductCompatibility(
    productId: string
): Promise<ProductCompatibilityInfo | null> {
    try {
        const response = await api.get<ProductCompatibilityInfo>(
            `/products/${productId}/compatibility/`
        );
        return response.data;
    } catch {
        return null;
    }
}
