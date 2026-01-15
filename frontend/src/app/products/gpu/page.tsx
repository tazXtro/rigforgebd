"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MonitorPlay, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ProductFilters,
  ProductGrid,
  Pagination,
} from "@/components/products";
import { getGPUs, getGPUFilters } from "@/lib/products";
import {
  Product,
  ProductFilters as ProductFiltersType,
  GPUFiltersResponse,
} from "@/types/product";

export default function GPUProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [filterOptions, setFilterOptions] = useState<GPUFiltersResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Local search state for immediate UI updates
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || ""
  );

  // Parse filters from URL
  const [filters, setFilters] = useState<ProductFiltersType>(() => ({
    search: searchParams.get("search") || undefined,
    brand: searchParams.get("brand") || undefined,
    memory_size: searchParams.get("memory_size") || undefined,
    chipset: searchParams.get("chipset") || undefined,
    min_price: searchParams.get("min_price")
      ? parseInt(searchParams.get("min_price")!)
      : undefined,
    max_price: searchParams.get("max_price")
      ? parseInt(searchParams.get("max_price")!)
      : undefined,
    page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
    page_size: 12,
  }));

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const options = await getGPUFilters();
        setFilterOptions(options);
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    }
    fetchFilterOptions();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch products when filters change
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getGPUs(filters);
      setProducts(response.results);
      setTotalCount(response.count);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.memory_size) params.set("memory_size", filters.memory_size);
    if (filters.chipset) params.set("chipset", filters.chipset);
    if (filters.min_price) params.set("min_price", filters.min_price.toString());
    if (filters.max_price) params.set("max_price", filters.max_price.toString());
    if (filters.page && filters.page > 1)
      params.set("page", filters.page.toString());

    const newUrl = params.toString()
      ? `/products/gpu?${params.toString()}`
      : "/products/gpu";
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  const handleFilterChange = (newFilters: ProductFiltersType) => {
    // Update search input if it changed
    if (newFilters.search !== undefined && newFilters.search !== searchInput) {
      setSearchInput(newFilters.search);
    }
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Link href="/products">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="p-2 rounded-lg bg-primary/10">
                <MonitorPlay className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Graphics Cards
                </h1>
                <p className="text-muted-foreground">
                  Compare prices across Bangladesh retailers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {totalCount} products
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProducts}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <ProductFilters
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              isLoading={isLoading}
            />
          </aside>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            <ProductGrid
              products={products}
              isLoading={isLoading}
              showSpecs={true}
            />

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
              <div className="mt-8">
                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
