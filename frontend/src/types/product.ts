export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Retailer {
  id: number;
  name: string;
  slug: string;
  website: string;
  logo: string;
}

export interface ProductPrice {
  id: number;
  retailer: Retailer;
  retailer_name: string;
  price: string;
  original_price: string | null;
  availability: 'in_stock' | 'out_of_stock' | 'pre_order' | 'upcoming';
  product_url: string;
  is_available: boolean;
  last_checked: string;
}

export interface GPUSpecification {
  chipset: string;
  memory_size: string;
  memory_type: string;
  memory_bus: string;
  base_clock: string;
  boost_clock: string;
  interface: string;
  power_connector: string;
  tdp: string;
  recommended_psu: string;
  hdmi_ports: number | null;
  displayport_ports: number | null;
  length: string;
  slots: string;
  cuda_cores: string;
  stream_processors: string;
  ray_tracing: boolean | null;
  dlss_support: boolean | null;
  fsr_support: boolean | null;
}

export interface Product {
  id: number;
  name: string;
  slug?: string;
  brand: string;
  model?: string;
  image: string;
  description?: string;
  category: Category;
  category_name: string;
  min_price: string;
  max_price: string;
  lowest_price?: string;
  prices: ProductPrice[];
  retailers_count?: number;
  gpu_specs?: GPUSpecification;
  created_at: string;
  updated_at?: string;
}

export interface ProductListResponse {
  results: Product[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GPUFiltersResponse {
  brands: string[];
  memory_sizes: string[];
  price_range: {
    min: number;
    max: number;
  };
  retailers: Retailer[];
}

export interface ProductFilters {
  search?: string;
  brand?: string;
  memory_size?: string;
  chipset?: string;
  min_price?: number;
  max_price?: number;
  retailer?: string;
  in_stock?: boolean;
  page?: number;
  page_size?: number;
}
