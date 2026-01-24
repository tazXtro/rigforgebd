"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
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
    ChevronDown,
    ChevronRight,
    Flame,
    ShoppingBag,
    ArrowRight,
    type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
    name: string
    icon: LucideIcon
    slug: string
    description: string
}

const categories: Category[] = [
    { name: "Processors", icon: Cpu, slug: "processors", description: "Intel & AMD CPUs" },
    { name: "Graphics Cards", icon: Gpu, slug: "graphics-cards", description: "NVIDIA & AMD GPUs" },
    { name: "Motherboards", icon: CircuitBoard, slug: "motherboards", description: "ATX, mATX & ITX" },
    { name: "Memory", icon: MemoryStick, slug: "memory", description: "DDR4 & DDR5 RAM" },
    { name: "Storage", icon: HardDrive, slug: "storage", description: "SSD & HDD Drives" },
    { name: "Power Supply", icon: BatteryCharging, slug: "power-supply", description: "Modular PSUs" },
    { name: "Cases", icon: Box, slug: "cases", description: "Tower & SFF Cases" },
    { name: "Cooling", icon: Fan, slug: "cooling", description: "Air & Liquid Coolers" },
    { name: "Monitors", icon: Monitor, slug: "monitors", description: "Gaming & Professional" },
    { name: "Accessories", icon: Headphones, slug: "accessories", description: "Peripherals & More" },
    { name: "Laptops", icon: Laptop, slug: "laptops", description: "Gaming & Workstation" },
    { name: "Pre-builts", icon: PcCase, slug: "pre-builts", description: "Ready-to-Use PCs" },
]

const trendingItems = [
    { name: "RTX 5090", slug: "graphics-cards" },
    { name: "Ryzen 9 9900X", slug: "processors" },
    { name: "DDR5 6400MHz", slug: "memory" },
    { name: "PCIe 5.0 SSD", slug: "storage" },
]

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.03,
            delayChildren: 0.1,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 200,
            damping: 20,
        },
    },
}

// Category Item Component
function CategoryItem({
    category,
    onClose,
}: {
    category: Category
    onClose: () => void
}) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <motion.div variants={itemVariants}>
            <Link
                href={`/products/${category.slug}`}
                onClick={onClose}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-accent/50"
            >
                {/* Icon container */}
                <motion.div
                    className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300"
                    animate={{
                        scale: isHovered ? 1.05 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                    <category.icon
                        className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110"
                        strokeWidth={1.75}
                    />

                    {/* Glow effect on hover */}
                    <motion.div
                        className="absolute inset-0 rounded-lg bg-primary/20 blur-md -z-10"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: isHovered ? 1 : 0,
                            scale: isHovered ? 1.2 : 0.8,
                        }}
                        transition={{ duration: 0.2 }}
                    />
                </motion.div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                        {category.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                        {category.description}
                    </p>
                </div>

                {/* Arrow indicator */}
                <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{
                        opacity: isHovered ? 1 : 0,
                        x: isHovered ? 0 : -4,
                    }}
                    transition={{ duration: 0.15 }}
                >
                    <ChevronRight className="w-4 h-4 text-primary" />
                </motion.div>
            </Link>
        </motion.div>
    )
}

// Main Mega Menu Component
export function ProductsMegaMenu({
    isOpen,
    onClose,
    triggerRef,
}: {
    isOpen: boolean
    onClose: () => void
    triggerRef: React.RefObject<HTMLElement | null>
}) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen, onClose, triggerRef])

    // Close on Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isOpen) {
                onClose()
            }
        }
        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                    }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[700px] max-w-[calc(100vw-2rem)]"
                >
                    {/* Main container with glass effect */}
                    <div className="bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
                                    <ShoppingBag className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground tracking-tight">
                                        Browse Products
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Compare prices across BD retailers
                                    </p>
                                </div>
                            </div>

                            {/* Bangladesh Taka symbol accent */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                <span>৳</span>
                                <span>Best Prices in BD</span>
                            </div>
                        </div>

                        {/* Categories Grid */}
                        <div className="p-4">
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="grid grid-cols-3 gap-1"
                            >
                                {categories.map((category) => (
                                    <CategoryItem
                                        key={category.slug}
                                        category={category}
                                        onClose={onClose}
                                    />
                                ))}
                            </motion.div>
                        </div>

                        {/* Footer - Trending Section */}
                        <div className="px-6 py-4 border-t border-border/30 bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <Flame className="w-4 h-4 text-orange-500" />
                                        <span className="font-medium text-foreground/80">Trending:</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {trendingItems.map((item, index) => (
                                            <Link
                                                key={item.name}
                                                href={`/products/${item.slug}?search=${encodeURIComponent(item.name)}`}
                                                onClick={onClose}
                                                className="text-xs px-2.5 py-1 rounded-full bg-background/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors duration-200"
                                            >
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <Link
                                    href="/products"
                                    onClick={onClose}
                                    className="group flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                    <span>View All</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// Mobile Products Accordion Component
export function MobileProductsAccordion({
    onClose,
}: {
    onClose: () => void
}) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="border-t border-border/30 pt-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-all"
            >
                <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="font-medium">Products</span>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-2 px-2 py-3">
                            {categories.map((category) => (
                                <Link
                                    key={category.slug}
                                    href={`/products/${category.slug}`}
                                    onClick={onClose}
                                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                                        <category.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                                    </div>
                                    <span className="text-sm text-foreground/80">{category.name}</span>
                                </Link>
                            ))}
                        </div>

                        {/* View All Link */}
                        <Link
                            href="/products"
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 mx-2 mb-2 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
                        >
                            <span>View All Products</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Products Nav Trigger (for Navbar integration)
export function ProductsNavTrigger({
    isActive,
    isMenuOpen,
    onToggle,
    triggerRef,
}: {
    isActive: boolean
    isMenuOpen: boolean
    onToggle: () => void
    triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
    return (
        <button
            ref={triggerRef}
            onClick={onToggle}
            className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-colors",
                "text-foreground/60 hover:text-primary",
                (isActive || isMenuOpen) && "text-primary"
            )}
        >
            <span className="flex items-center gap-1.5">
                <ShoppingBag size={16} strokeWidth={2} aria-hidden="true" />
                <span className="hidden xl:inline">Products</span>
                <motion.div
                    animate={{ rotate: isMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={14} strokeWidth={2} />
                </motion.div>
            </span>

            {/* Tubelight glow effect */}
            {(isActive || isMenuOpen) && (
                <motion.div
                    layoutId="tubelight-nav"
                    className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                    initial={false}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                    }}
                >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                        <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                        <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                        <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                    </div>
                </motion.div>
            )}
        </button>
    )
}
