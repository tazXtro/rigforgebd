"use client"

import { useState, useMemo, useCallback, useEffect, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
    LayoutGrid,
    List,
    ChevronDown,
    ArrowUpDown,
    Package,
    Loader2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    X,
    Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    ProductGrid,
    SearchBar,
    CategoryNav,
    ProductFilters,
    MobileFilters,
    filterProducts,
    sortProducts,
} from "@/components/products"
import { Product } from "@/components/products/ProductCard"
import { fetchProducts, fetchCategoryCounts, fetchRetailers, PaginationInfo, Retailer } from "@/lib/productsApi"

interface ProductsPageClientProps {
    initialCategory?: string
    // Server-side fetched initial data (Next.js cached)
    initialProducts?: Product[]
    initialPagination?: PaginationInfo | null
    initialCategoryCounts?: Record<string, number>
    initialRetailers?: Retailer[]
}

const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "name_asc", label: "Name: A to Z" },
    { value: "name_desc", label: "Name: Z to A" },
]

const PAGE_SIZE = 24 // Products per page

export function ProductsPageClient({
    initialCategory = "",
    initialProducts = [],
    initialPagination = null,
    initialCategoryCounts = {},
    initialRetailers = [],
}: ProductsPageClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Products state - initialize with server-provided data
    const [products, setProducts] = useState<Product[]>(initialProducts)
    const [pagination, setPagination] = useState<PaginationInfo | null>(initialPagination)
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(initialCategoryCounts)
    const [retailers, setRetailers] = useState<Retailer[]>(initialRetailers)
    const [isLoading, setIsLoading] = useState(false) // Start with false since we have initial data
    const [error, setError] = useState<string | null>(null)

    // Pagination state from URL
    const currentPage = parseInt(searchParams.get("page") || "1", 10)
    const cpuId = searchParams.get("cpu_id") || undefined
    const motherboardId = searchParams.get("motherboard_id") || undefined
    const compatMode = (searchParams.get("compat_mode") as "strict" | "lenient" | null) || undefined

    // Filter state
    const [search, setSearch] = useState(searchParams.get("q") || "")
    const [debouncedSearch, setDebouncedSearch] = useState(search)
    const [category, setCategory] = useState(initialCategory)
    const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [isSortOpen, setIsSortOpen] = useState(false)
    const [filters, setFilters] = useState({
        brands: [] as string[],
        retailers: [] as string[],
        minPrice: 0,
        maxPrice: 1000000,
        inStock: false,
    })

    // Track if we need client-side fetch (after initial server render)
    const [needsClientFetch, setNeedsClientFetch] = useState(false)

    // Check if user navigated from system builder
    const isFromBuilder = searchParams.get("source") === "builder"

    // Handle cancel selection - return to builder
    const handleCancelSelection = useCallback(() => {
        router.push("/builder")
    }, [router])

    // Debounce search input to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 300) // 300ms debounce
        return () => clearTimeout(timer)
    }, [search])

    // Only fetch on client when user interacts (category change, search, pagination)
    // Initial data comes from server with Next.js caching
    useEffect(() => {
        // Skip initial render - we already have server data
        if (!needsClientFetch) {
            return
        }

        async function loadData() {
            setIsLoading(true)
            setError(null)
            try {
                // Fetch products with all filters
                const productsResponse = await fetchProducts({
                    category: category || undefined,
                    search: debouncedSearch || undefined,
                    brand: filters.brands.length > 0 ? filters.brands.join(",") : undefined,
                    sort: sortBy || undefined,
                    cpu_id: cpuId,
                    motherboard_id: motherboardId,
                    compat_mode: compatMode,
                    page: currentPage,
                    page_size: PAGE_SIZE,
                    min_price: filters.minPrice > 0 ? filters.minPrice : undefined,
                    max_price: filters.maxPrice < 1000000 ? filters.maxPrice : undefined,
                    retailers: filters.retailers.length > 0 ? filters.retailers.join(",") : undefined,
                })
                setProducts(productsResponse.products)
                setPagination(productsResponse.pagination)

                // Only refetch counts/retailers if category changed
                if (category !== initialCategory) {
                    const [countsData, retailersData] = await Promise.all([
                        fetchCategoryCounts(),
                        fetchRetailers(),
                    ])
                    setCategoryCounts(countsData)
                    setRetailers(retailersData)
                }
            } catch (err) {
                console.error("Failed to fetch data:", err)
                setError("Failed to load products. Please try again later.")
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [category, currentPage, debouncedSearch, sortBy, cpuId, motherboardId, compatMode, filters.brands.join(','), filters.minPrice, filters.maxPrice, filters.retailers.join(','), needsClientFetch, initialCategory])

    // Mark that future changes need client fetch
    useEffect(() => {
        setNeedsClientFetch(true)
    }, [category, debouncedSearch, sortBy, currentPage, cpuId, motherboardId, compatMode, filters.brands.join(','), filters.minPrice, filters.maxPrice, filters.retailers.join(',')])

    // All filtering is now handled server-side
    // Just use products directly from the API
    const filteredProducts = products

    // Pagination handlers
    const handlePageChange = useCallback((newPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("page", newPage.toString())

        const basePath = category ? `/products/${category}` : "/products"
        router.push(`${basePath}?${params.toString()}`)

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: "smooth" })
    }, [router, searchParams, category])

    // Handle search change - resets to page 1
    const handleSearchChange = useCallback((value: string) => {
        setSearch(value)
        // Reset to page 1 when search changes (handled by URL update)
        if (currentPage !== 1) {
            const params = new URLSearchParams(searchParams.toString())
            params.delete("page")
            if (value) {
                params.set("q", value)
            } else {
                params.delete("q")
            }
            const basePath = category ? `/products/${category}` : "/products"
            router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`)
        }
    }, [router, searchParams, category, currentPage])

    // Handlers
    const handleFilterChange = useCallback((key: string, value: unknown) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
    }, [])

    const handleClearFilters = useCallback(() => {
        setFilters({
            brands: [],
            retailers: [],
            minPrice: 0,
            maxPrice: 1000000,
            inStock: false,
        })
        setSearch("")
        // Reset to page 1
        const basePath = category ? `/products/${category}` : "/products"
        router.push(basePath)
    }, [router, category])

    const handleCategoryChange = useCallback((slug: string) => {
        setCategory(slug)
        // Reset to page 1 when changing category
        if (slug) {
            router.push(`/products/${slug}`)
        } else {
            router.push("/products")
        }
    }, [router])

    const handleSortChange = useCallback((value: string) => {
        setSortBy(value)
        setIsSortOpen(false)
    }, [])

    // Get category name for title
    const getCategoryTitle = () => {
        if (!category) return "All Products"
        const categoryMap: Record<string, string> = {
            processors: "Processors",
            "graphics-cards": "Graphics Cards",
            motherboards: "Motherboards",
            memory: "Memory (RAM)",
            storage: "Storage",
            "power-supply": "Power Supplies",
            cases: "PC Cases",
            cooling: "Cooling",
            monitors: "Monitors",
            accessories: "Accessories",
            laptops: "Laptops",
            "pre-builts": "Pre-built PCs",
        }
        return categoryMap[category] || "All Products"
    }

    return (
        <div className="container py-8">
            {/* Selection Mode Banner - shown when navigating from builder */}
            {isFromBuilder && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Wrench className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                Select a {getCategoryTitle().replace(/s$/, '')} for your build
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Click the <span className="font-medium text-primary">Add</span> button on any product to add it to your PC build
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleCancelSelection}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background border border-border/50 rounded-lg hover:border-border transition-colors"
                    >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Cancel</span>
                    </button>
                </motion.div>
            )}

            {/* Page Header */}
            <div className="mb-8">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1 mb-6"
                >
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        {getCategoryTitle()}
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>
                            {pagination
                                ? `${pagination.total_count} products found`
                                : `${filteredProducts.length} products found`
                            }
                        </span>
                    </p>
                </motion.div>

                {/* Search and Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <SearchBar
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Search products, brands, categories..."
                        className="flex-1"
                    />

                    <div className="flex items-center gap-3">
                        {/* Mobile Filters */}
                        <MobileFilters
                            filters={filters}
                            activeCategory={category}
                            onFilterChange={handleFilterChange}
                            onCategoryChange={handleCategoryChange}
                            onClearAll={handleClearFilters}
                            resultCount={filteredProducts.length}
                            categoryCounts={categoryCounts}
                            retailers={retailers}
                        />

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-card border border-border/50 rounded-xl text-sm font-medium hover:border-primary/30 transition-colors"
                            >
                                <ArrowUpDown className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {sortOptions.find((o) => o.value === sortBy)?.label || "Sort"}
                                </span>
                                <ChevronDown className={cn(
                                    "w-4 h-4 transition-transform",
                                    isSortOpen && "rotate-180"
                                )} />
                            </button>

                            {isSortOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsSortOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute right-0 mt-2 w-48 bg-popover border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden"
                                    >
                                        {sortOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleSortChange(option.value)}
                                                className={cn(
                                                    "w-full px-4 py-2.5 text-sm text-left transition-colors",
                                                    sortBy === option.value
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </div>

                        {/* View Toggle */}
                        <div className="hidden sm:flex items-center border border-border/50 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "p-2 transition-colors",
                                    viewMode === "grid"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:text-foreground"
                                )}
                                aria-label="Grid view"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "p-2 transition-colors",
                                    viewMode === "list"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:text-foreground"
                                )}
                                aria-label="List view"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-8">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-64 shrink-0">
                    <div className="sticky top-24 space-y-8">
                        <CategoryNav
                            activeCategory={category}
                            onCategoryChange={handleCategoryChange}
                            categoryCounts={categoryCounts}
                        />

                        <div className="border-t border-border/50 pt-6">
                            <ProductFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onClearAll={handleClearFilters}
                                retailers={retailers}
                                category={category}
                            />
                        </div>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="flex-1 min-w-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                            <p className="text-muted-foreground">Loading products...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <AlertCircle className="w-10 h-10 text-destructive mb-4" />
                            <p className="text-destructive font-medium mb-2">Error loading products</p>
                            <p className="text-muted-foreground text-sm">{error}</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Package className="w-10 h-10 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground font-medium mb-2">No products found</p>
                            <p className="text-muted-foreground text-sm">
                                {search || category ? "Try adjusting your filters" : "Products will appear here once they are added to the database"}
                            </p>
                        </div>
                    ) : (
                        <ProductGrid products={filteredProducts} viewMode={viewMode} />
                    )}

                    {/* Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * Pagination component with smart page number display
 */
function Pagination({
    pagination,
    onPageChange,
}: {
    pagination: PaginationInfo
    onPageChange: (page: number) => void
}) {
    const { page, total_pages, has_prev, has_next } = pagination

    // Generate page numbers to display
    const getPageNumbers = (): (number | "...")[] => {
        const pages: (number | "...")[] = []
        const showPages = 5 // Max visible page numbers

        if (total_pages <= showPages + 2) {
            // Show all pages if total is small
            for (let i = 1; i <= total_pages; i++) {
                pages.push(i)
            }
        } else {
            // Always show first page
            pages.push(1)

            if (page > 3) {
                pages.push("...")
            }

            // Show pages around current
            const start = Math.max(2, page - 1)
            const end = Math.min(total_pages - 1, page + 1)

            for (let i = start; i <= end; i++) {
                pages.push(i)
            }

            if (page < total_pages - 2) {
                pages.push("...")
            }

            // Always show last page
            pages.push(total_pages)
        }

        return pages
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
            {/* Page info */}
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Page {page} of {total_pages}
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-2 order-1 sm:order-2">
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!has_prev}
                    className={cn(
                        "flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors",
                        has_prev
                            ? "bg-card border border-border/50 text-foreground hover:border-primary/30 hover:bg-muted"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, idx) =>
                        pageNum === "..." ? (
                            <span
                                key={`ellipsis-${idx}`}
                                className="px-2 text-muted-foreground"
                            >
                                ...
                            </span>
                        ) : (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={cn(
                                    "w-10 h-10 text-sm rounded-lg transition-colors",
                                    pageNum === page
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "bg-card border border-border/50 text-foreground hover:border-primary/30 hover:bg-muted"
                                )}
                            >
                                {pageNum}
                            </button>
                        )
                    )}
                </div>

                {/* Next button */}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!has_next}
                    className={cn(
                        "flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors",
                        has_next
                            ? "bg-card border border-border/50 text-foreground hover:border-primary/30 hover:bg-muted"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
}
