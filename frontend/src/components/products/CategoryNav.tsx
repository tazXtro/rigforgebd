"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    Cpu,
    Gpu,
    CircuitBoard,
    MemoryStick,
    HardDrive,
    BatteryCharging,
    Box,
    Fan,
    Monitor,
    Headphones,
    Laptop,
    PcCase,
    LayoutGrid,
    ChevronDown,
    type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
    name: string
    icon: LucideIcon
    slug: string
}

const categories: Category[] = [
    { name: "All Products", icon: LayoutGrid, slug: "" },
    { name: "Processors", icon: Cpu, slug: "processors" },
    { name: "Graphics Cards", icon: Gpu, slug: "graphics-cards" },
    { name: "Motherboards", icon: CircuitBoard, slug: "motherboards" },
    { name: "Memory", icon: MemoryStick, slug: "memory" },
    { name: "Storage", icon: HardDrive, slug: "storage" },
    { name: "Power Supply", icon: BatteryCharging, slug: "power-supply" },
    { name: "Cases", icon: Box, slug: "cases" },
    { name: "Cooling", icon: Fan, slug: "cooling" },
    { name: "Monitors", icon: Monitor, slug: "monitors" },
    { name: "Accessories", icon: Headphones, slug: "accessories" },
    { name: "Laptops", icon: Laptop, slug: "laptops" },
    { name: "Pre-builts", icon: PcCase, slug: "pre-builts" },
]

interface CategoryNavProps {
    activeCategory?: string
    onCategoryChange?: (slug: string) => void
    categoryCounts?: Record<string, number>
    defaultExpanded?: boolean
}

export function CategoryNav({
    activeCategory = "",
    onCategoryChange,
    categoryCounts = {},
    defaultExpanded = true
}: CategoryNavProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    // Get active category name for collapsed view
    const activeCategoryName = categories.find(c => c.slug === activeCategory)?.name || "All Products"
    const totalCount = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)

    return (
        <nav className="space-y-1" aria-label="Categories">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted/50"
            >
                <span>Categories</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-normal">
                        {activeCategoryName}
                    </span>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                </div>
            </button>

            {/* Expandable Content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pt-1 space-y-0.5">
                            {categories.map((category) => {
                                const isActive = activeCategory === category.slug
                                const href = category.slug ? `/products/${category.slug}` : "/products"
                                const count = categoryCounts[category.slug] ?? 0

                                return (
                                    <Link
                                        key={category.slug || "all"}
                                        href={href}
                                        onClick={(e) => {
                                            if (onCategoryChange) {
                                                e.preventDefault()
                                                onCategoryChange(category.slug)
                                            }
                                        }}
                                        className={cn(
                                            "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                            isActive
                                                ? "text-primary bg-primary/10 font-medium"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="category-indicator"
                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <category.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                                        <span className="flex-1">{category.name}</span>
                                        <span className={cn(
                                            "text-xs",
                                            isActive ? "text-primary/70" : "text-muted-foreground/60"
                                        )}>
                                            {count}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}

export { categories }
