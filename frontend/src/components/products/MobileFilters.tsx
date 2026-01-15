"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SlidersHorizontal, X } from "lucide-react"
import { ProductFilters } from "./ProductFilters"
import { CategoryNav } from "./CategoryNav"

interface MobileFiltersProps {
    filters: {
        brands: string[]
        retailers: string[]
        minPrice: number
        maxPrice: number
        inStock: boolean
    }
    activeCategory: string
    onFilterChange: (key: string, value: unknown) => void
    onCategoryChange: (slug: string) => void
    onClearAll: () => void
    resultCount: number
    categoryCounts?: Record<string, number>
}

export function MobileFilters({
    filters,
    activeCategory,
    onFilterChange,
    onCategoryChange,
    onClearAll,
    resultCount,
    categoryCounts = {},
}: MobileFiltersProps) {
    const [isOpen, setIsOpen] = useState(false)

    const activeFilterCount =
        filters.brands.length +
        filters.retailers.length +
        (filters.inStock ? 1 : 0) +
        (filters.minPrice > 0 ? 1 : 0) +
        (filters.maxPrice < 1000000 ? 1 : 0)

    return (
        <>
            {/* Filter Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border/50 rounded-xl text-sm font-medium hover:border-primary/30 transition-colors lg:hidden"
            >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full">
                        {activeFilterCount}
                    </span>
                )}
            </button>

            {/* Slide-over Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background z-50 lg:hidden overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="sticky top-0 flex items-center justify-between px-4 py-4 bg-background border-b border-border/50">
                                <h2 className="text-lg font-semibold">Filters & Categories</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-full hover:bg-muted transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-6">
                                {/* Categories */}
                                <CategoryNav
                                    activeCategory={activeCategory}
                                    onCategoryChange={(slug) => {
                                        onCategoryChange(slug)
                                        setIsOpen(false)
                                    }}
                                    categoryCounts={categoryCounts}
                                />

                                <div className="border-t border-border/50 pt-6">
                                    <ProductFilters
                                        filters={filters}
                                        onFilterChange={onFilterChange}
                                        onClearAll={onClearAll}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 flex gap-3 p-4 bg-background border-t border-border/50">
                                <button
                                    onClick={onClearAll}
                                    className="flex-1 px-4 py-3 border border-border/50 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                                >
                                    Clear All
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Show {resultCount} Results
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
