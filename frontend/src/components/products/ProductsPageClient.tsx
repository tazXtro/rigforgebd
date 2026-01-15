"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
    LayoutGrid,
    List,
    ChevronDown,
    ArrowUpDown,
    Package,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    ProductGrid,
    SearchBar,
    CategoryNav,
    ProductFilters,
    MobileFilters,
    mockProducts,
    filterProducts,
    sortProducts,
} from "@/components/products"

interface ProductsPageClientProps {
    initialCategory?: string
}

const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "name_asc", label: "Name: A to Z" },
    { value: "name_desc", label: "Name: Z to A" },
]

export function ProductsPageClient({ initialCategory = "" }: ProductsPageClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // State
    const [search, setSearch] = useState(searchParams.get("q") || "")
    const [category, setCategory] = useState(initialCategory)
    const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [isSortOpen, setIsSortOpen] = useState(false)
    const [filters, setFilters] = useState({
        brands: [] as string[],
        retailers: [] as string[],
        minPrice: 0,
        maxPrice: 500000,
        inStock: false,
    })

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        const filtered = filterProducts(mockProducts, {
            search,
            category,
            brands: filters.brands,
            retailers: filters.retailers,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            inStock: filters.inStock,
        })
        return sortProducts(filtered, sortBy)
    }, [search, category, filters, sortBy])

    // Handlers
    const handleFilterChange = useCallback((key: string, value: unknown) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
    }, [])

    const handleClearFilters = useCallback(() => {
        setFilters({
            brands: [],
            retailers: [],
            minPrice: 0,
            maxPrice: 500000,
            inStock: false,
        })
        setSearch("")
    }, [])

    const handleCategoryChange = useCallback((slug: string) => {
        setCategory(slug)
        // Update URL
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
                        <span>{filteredProducts.length} products found</span>
                    </p>
                </motion.div>

                {/* Search and Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
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
                        />

                        <div className="border-t border-border/50 pt-6">
                            <ProductFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onClearAll={handleClearFilters}
                            />
                        </div>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="flex-1 min-w-0">
                    <ProductGrid products={filteredProducts} viewMode={viewMode} />

                    {/* Pagination placeholder */}
                    {filteredProducts.length > 0 && (
                        <div className="mt-8 flex justify-center">
                            <div className="flex items-center gap-2">
                                <button className="px-4 py-2 text-sm bg-card border border-border/50 rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                                    Previous
                                </button>
                                {[1, 2, 3].map((page) => (
                                    <button
                                        key={page}
                                        className={cn(
                                            "w-10 h-10 text-sm rounded-lg transition-colors",
                                            page === 1
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <span className="text-muted-foreground">...</span>
                                <button className="px-4 py-2 text-sm bg-card border border-border/50 rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
