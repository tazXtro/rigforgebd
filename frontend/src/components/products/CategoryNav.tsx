"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
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
    type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
    name: string
    icon: LucideIcon
    slug: string
    count: number
}

const categories: Category[] = [
    { name: "All Products", icon: LayoutGrid, slug: "", count: 1234 },
    { name: "Processors", icon: Cpu, slug: "processors", count: 156 },
    { name: "Graphics Cards", icon: Gpu, slug: "graphics-cards", count: 89 },
    { name: "Motherboards", icon: CircuitBoard, slug: "motherboards", count: 124 },
    { name: "Memory", icon: MemoryStick, slug: "memory", count: 78 },
    { name: "Storage", icon: HardDrive, slug: "storage", count: 203 },
    { name: "Power Supply", icon: BatteryCharging, slug: "power-supply", count: 67 },
    { name: "Cases", icon: Box, slug: "cases", count: 91 },
    { name: "Cooling", icon: Fan, slug: "cooling", count: 145 },
    { name: "Monitors", icon: Monitor, slug: "monitors", count: 112 },
    { name: "Accessories", icon: Headphones, slug: "accessories", count: 89 },
    { name: "Laptops", icon: Laptop, slug: "laptops", count: 56 },
    { name: "Pre-builts", icon: PcCase, slug: "pre-builts", count: 24 },
]

interface CategoryNavProps {
    activeCategory?: string
    onCategoryChange?: (slug: string) => void
}

export function CategoryNav({ activeCategory = "", onCategoryChange }: CategoryNavProps) {
    const pathname = usePathname()

    return (
        <nav className="space-y-1" aria-label="Categories">
            <h3 className="text-sm font-semibold text-foreground mb-3 px-3">Categories</h3>
            {categories.map((category) => {
                const isActive = activeCategory === category.slug
                const href = category.slug ? `/products/${category.slug}` : "/products"

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
                            {category.count}
                        </span>
                    </Link>
                )
            })}
        </nav>
    )
}

export { categories }
