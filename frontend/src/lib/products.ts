import api from './api';
import {
  Product,
  ProductListResponse,
  GPUFiltersResponse,
  ProductFilters,
  Category,
  Retailer,
} from '@/types/product';

/**
 * Get all product categories
 */
export async function getCategories(): Promise<Category[]> {
  const response = await api.get('/products/categories/');
  return response.data;
}

/**
 * Get all retailers
 */
export async function getRetailers(): Promise<Retailer[]> {
  const response = await api.get('/products/retailers/');
  return response.data;
}

/**
 * Get products with optional filtering
 */
export async function getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.brand) params.append('brand', filters.brand);
  if (filters.min_price) params.append('min_price', filters.min_price.toString());
  if (filters.max_price) params.append('max_price', filters.max_price.toString());
  if (filters.retailer) params.append('retailer', filters.retailer);
  if (filters.in_stock) params.append('in_stock', 'true');
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.page_size) params.append('page_size', filters.page_size.toString());
  
  const response = await api.get(`/products/?${params.toString()}`);
  return response.data;
}

/**
 * Get a single product by ID
 */
export async function getProduct(id: number): Promise<Product> {
  const response = await api.get(`/products/${id}/`);
  return response.data;
}

/**
 * Get GPU products with GPU-specific filtering
 */
export async function getGPUs(filters: ProductFilters = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.brand) params.append('brand', filters.brand);
  if (filters.memory_size) params.append('memory_size', filters.memory_size);
  if (filters.chipset) params.append('chipset', filters.chipset);
  if (filters.min_price) params.append('min_price', filters.min_price.toString());
  if (filters.max_price) params.append('max_price', filters.max_price.toString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.page_size) params.append('page_size', filters.page_size.toString());
  
  const response = await api.get(`/products/gpus/?${params.toString()}`);
  return response.data;
}

/**
 * Get GPU filter options
 */
export async function getGPUFilters(): Promise<GPUFiltersResponse> {
  const response = await api.get('/products/gpus/filters/');
  return response.data;
}
