"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, X, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Retailer } from "@/lib/productsApi"

interface FilterSection {
    id: string
    label: string
    options: { value: string; label: string; count?: number }[]
}

interface ProductFiltersProps {
    filters: {
        brands: string[]
        retailers: string[]
        minPrice: number
        maxPrice: number
        inStock: boolean
    }
    onFilterChange: (key: string, value: unknown) => void
    onClearAll: () => void
    retailers?: Retailer[]  // Dynamic retailers from API
}

const brandOptions = [
    { value: "amd", label: "AMD", count: 234 },
    { value: "intel", label: "Intel", count: 189 },
    { value: "nvidia", label: "NVIDIA", count: 156 },
    { value: "asus", label: "ASUS", count: 312 },
    { value: "msi", label: "MSI", count: 278 },
    { value: "gigabyte", label: "Gigabyte", count: 245 },
    { value: "corsair", label: "Corsair", count: 167 },
    { value: "gskill", label: "G.Skill", count: 89 },
    { value: "samsung", label: "Samsung", count: 134 },
    { value: "western-digital", label: "Western Digital", count: 98 },
]

function FilterAccordion({
    title,
    isOpen,
    onToggle,
    children,
}: {
    title: string
    isOpen: boolean
    onToggle: () => void
    children: React.ReactNode
}) {
    return (
        <div className="border-b border-border/50 pb-4">
            <button
                onClick={onToggle}
                className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
                {title}
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export function ProductFilters({ filters, onFilterChange, onClearAll, retailers = [] }: ProductFiltersProps) {
    // Convert retailers to option format for rendering
    const retailerOptions = retailers.map(r => ({
        value: r.slug,
        label: r.name,
        count: r.product_count,
    }))
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        price: true,
        brands: true,
        retailers: false,
        availability: true,
    })

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
    }

    const handleBrandToggle = (brand: string) => {
        const newBrands = filters.brands.includes(brand)
            ? filters.brands.filter((b) => b !== brand)
            : [...filters.brands, brand]
        onFilterChange("brands", newBrands)
    }

    const handleRetailerToggle = (retailer: string) => {
        const newRetailers = filters.retailers.includes(retailer)
            ? filters.retailers.filter((r) => r !== retailer)
            : [...filters.retailers, retailer]
        onFilterChange("retailers", newRetailers)
    }

    const hasActiveFilters =
        filters.brands.length > 0 ||
        filters.retailers.length > 0 ||
        filters.minPrice > 0 ||
        filters.maxPrice < 1000000 ||
        filters.inStock

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                {hasActiveFilters && (
                    <button
                        onClick={onClearAll}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Clear all
                    </button>
                )}
            </div>

            {/* Price Range */}
            <FilterAccordion
                title="Price Range"
                isOpen={openSections.price}
                onToggle={() => toggleSection("price")}
            >
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                                <input
                                    type="number"
                                    value={filters.minPrice || ""}
                                    onChange={(e) => onFilterChange("minPrice", Number(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full h-9 pl-6 pr-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                        <span className="text-muted-foreground mt-5">—</span>
                        <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                                <input
                                    type="number"
                                    value={filters.maxPrice === 1000000 ? "" : filters.maxPrice}
                                    onChange={(e) => onFilterChange("maxPrice", Number(e.target.value) || 1000000)}
                                    placeholder="1,000,000"
                                    className="w-full h-9 pl-6 pr-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Price Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            { label: "Under ৳10K", min: 0, max: 10000 },
                            { label: "৳10K-50K", min: 10000, max: 50000 },
                            { label: "৳50K-100K", min: 50000, max: 100000 },
                            { label: "Over ৳100K", min: 100000, max: 1000000 },
                        ].map((range) => (
                            <button
                                key={range.label}
                                onClick={() => {
                                    onFilterChange("minPrice", range.min)
                                    onFilterChange("maxPrice", range.max)
                                }}
                                className={cn(
                                    "px-2 py-1 text-xs rounded-full border transition-colors",
                                    filters.minPrice === range.min && filters.maxPrice === range.max
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border/50 text-muted-foreground hover:border-primary hover:text-primary"
                                )}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>
            </FilterAccordion>

            {/* Brands */}
            <FilterAccordion
                title="Brands"
                isOpen={openSections.brands}
                onToggle={() => toggleSection("brands")}
            >
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {brandOptions.map((brand) => (
                        <label
                            key={brand.value}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <input
                                type="checkbox"
                                checked={filters.brands.includes(brand.value)}
                                onChange={() => handleBrandToggle(brand.value)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                            />
                            <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                {brand.label}
                            </span>
                            <span className="text-xs text-muted-foreground/60">{brand.count}</span>
                        </label>
                    ))}
                </div>
            </FilterAccordion>

            {/* Retailers */}
            <FilterAccordion
                title="Retailers"
                isOpen={openSections.retailers}
                onToggle={() => toggleSection("retailers")}
            >
                <div className="space-y-2">
                    {retailerOptions.map((retailer) => (
                        <label
                            key={retailer.value}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <input
                                type="checkbox"
                                checked={filters.retailers.includes(retailer.value)}
                                onChange={() => handleRetailerToggle(retailer.value)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                            />
                            <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                {retailer.label}
                            </span>
                            <span className="text-xs text-muted-foreground/60">{retailer.count}</span>
                        </label>
                    ))}
                </div>
            </FilterAccordion>

            {/* Availability */}
            <FilterAccordion
                title="Availability"
                isOpen={openSections.availability}
                onToggle={() => toggleSection("availability")}
            >
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={filters.inStock}
                        onChange={(e) => onFilterChange("inStock", e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        In stock only
                    </span>
                </label>
            </FilterAccordion>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
                <div className="pt-4 border-t border-border/50">
                    <div className="flex flex-wrap gap-1.5">
                        {filters.brands.map((brand) => (
                            <span
                                key={brand}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                            >
                                {brandOptions.find((b) => b.value === brand)?.label}
                                <button onClick={() => handleBrandToggle(brand)}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {filters.retailers.map((retailer) => (
                            <span
                                key={retailer}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                            >
                                {retailers.find((r) => r.slug === retailer)?.name || retailer}
                                <button onClick={() => handleRetailerToggle(retailer)}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {filters.inStock && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full">
                                In stock
                                <button onClick={() => onFilterChange("inStock", false)}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
