"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    ExternalLink,
    Heart,
    TrendingDown,
    Store,
    Package,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AddToBuildButton } from "./AddToBuildButton"

export interface ProductRetailer {
    name: string
    price: number
    inStock: boolean
    url: string
}

export interface Product {
    id: string
    listing_id?: string  // Unique ID for each retailer listing (used for React keys)
    name: string
    slug: string
    category: string
    categorySlug: string
    image: string
    retailers: ProductRetailer[]
    brand: string
    specs?: Record<string, string>
    // Retailer availability info (for per-listing display)
    total_retailers?: number  // How many stores carry this product
    in_stock_count?: number   // How many stores have it in stock
}

interface ProductCardProps {
    product: Product
    viewMode?: "grid" | "list"
}

export function ProductCard({ product, viewMode = "grid" }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [showRetailers, setShowRetailers] = useState(false)

    // Find lowest and highest prices
    const prices = product.retailers.map(r => r.price)
    const lowestPrice = Math.min(...prices)
    const highestPrice = Math.max(...prices)
    const lowestRetailer = product.retailers.find(r => r.price === lowestPrice)
    // Use total counts from backend if available (for per-listing display)
    const totalRetailers = product.total_retailers || product.retailers.length
    const inStockCount = product.in_stock_count ?? product.retailers.filter(r => r.inStock).length
    const hasMultiplePrices = prices.length > 1 && lowestPrice !== highestPrice
    const hasMultipleRetailers = product.retailers.length > 1

    // Sort retailers by price (lowest first)
    const sortedRetailers = [...product.retailers].sort((a, b) => a.price - b.price)

    // Format price with Taka symbol
    const formatPrice = (price: number) => {
        return `৳${price.toLocaleString("en-BD")}`
    }

    if (viewMode === "list") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
                <div className="flex gap-4 p-4">
                    {/* Image */}
                    <div className="relative w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-muted">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                                <Link href={`/products/${product.categorySlug}/${product.slug}`}>
                                    <h3 className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2">
                                        {product.name}
                                    </h3>
                                </Link>
                            </div>
                            <button
                                onClick={() => setIsFavorite(!isFavorite)}
                                className="p-2 rounded-full hover:bg-muted transition-colors"
                            >
                                <Heart
                                    className={cn(
                                        "w-5 h-5 transition-colors",
                                        isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                    )}
                                />
                            </button>
                        </div>

                        <div className="mt-3 flex items-center gap-4 flex-wrap">
                            <div>
                                <p className="text-xl font-bold text-primary">{formatPrice(lowestPrice)}</p>
                                {hasMultiplePrices && (
                                    <p className="text-xs text-muted-foreground">
                                        up to {formatPrice(highestPrice)}
                                    </p>
                                )}
                            </div>

                            {/* Clickable retailer count to expand/collapse */}
                            {hasMultipleRetailers ? (
                                <button
                                    onClick={() => setShowRetailers(!showRetailers)}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Store className="w-4 h-4" />
                                    <span>{totalRetailers} retailer{totalRetailers > 1 ? "s" : ""}</span>
                                    {showRetailers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Store className="w-4 h-4" />
                                    <span>{totalRetailers} retailer</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-sm">
                                <Package className="w-4 h-4" />
                                <span className={inStockCount > 0 ? "text-green-600" : "text-red-500"}>
                                    {inStockCount > 0 ? `${inStockCount} in stock` : "Out of stock"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-center">
                        <AddToBuildButton product={product} variant="compact" />
                        <Link
                            href={`/products/${product.categorySlug}/${product.slug}`}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Compare Prices
                        </Link>
                    </div>
                </div>

                {/* Expandable retailer prices */}
                <AnimatePresence>
                    {showRetailers && hasMultipleRetailers && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 pt-2 border-t border-border/50">
                                <p className="text-xs font-medium text-muted-foreground mb-2">All retailer prices:</p>
                                <div className="grid gap-2">
                                    {sortedRetailers.map((retailer, index) => (
                                        <a
                                            key={`${retailer.name}-${index}`}
                                            href={retailer.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                                "flex items-center justify-between p-2 rounded-lg border transition-colors",
                                                index === 0
                                                    ? "border-green-500/50 bg-green-500/5 hover:bg-green-500/10"
                                                    : "border-border/50 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Store className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">{retailer.name}</span>
                                                {index === 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full font-medium">
                                                        Lowest
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-xs",
                                                    retailer.inStock ? "text-green-600" : "text-red-500"
                                                )}>
                                                    {retailer.inStock ? "In Stock" : "Out of Stock"}
                                                </span>
                                                <span className={cn(
                                                    "font-bold",
                                                    index === 0 ? "text-green-600 dark:text-green-400" : "text-foreground"
                                                )}>
                                                    {formatPrice(retailer.price)}
                                                </span>
                                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300"
        >
            {/* Favorite Button */}
            <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
            >
                <Heart
                    className={cn(
                        "w-4 h-4 transition-colors",
                        isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )}
                />
            </button>

            {/* Price Drop Badge */}
            {hasMultiplePrices && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium">
                    <TrendingDown className="w-3 h-3" />
                    <span>Compare</span>
                </div>
            )}

            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />

                {/* Quick View Overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                    <Link
                        href={`/products/${product.categorySlug}/${product.slug}`}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Compare Prices
                    </Link>
                </motion.div>
            </div>

            {/* Content */}
            <div className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>

                <Link href={`/products/${product.categorySlug}/${product.slug}`}>
                    <h3 className="font-medium text-sm text-foreground hover:text-primary transition-colors line-clamp-2 min-h-10">
                        {product.name}
                    </h3>
                </Link>

                <div className="mt-3 flex items-end justify-between">
                    <div>
                        <p className="text-lg font-bold text-primary">{formatPrice(lowestPrice)}</p>
                        {lowestRetailer && (
                            <p className="text-xs text-muted-foreground">
                                at {lowestRetailer.name}
                            </p>
                        )}
                    </div>

                    {/* Clickable retailer count to expand/collapse */}
                    {hasMultipleRetailers ? (
                        <button
                            onClick={() => setShowRetailers(!showRetailers)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Store className="w-3 h-3" />
                            <span>{totalRetailers}</span>
                            {showRetailers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Store className="w-3 h-3" />
                            <span>{totalRetailers}</span>
                        </div>
                    )}
                </div>

                {/* Stock Status and Add Button */}
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                    <p className={cn(
                        "text-xs font-medium",
                        inStockCount > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                    )}>
                        {inStockCount > 0 ? `${inStockCount} store${inStockCount > 1 ? "s" : ""} have stock` : "Out of stock"}
                    </p>
                    <AddToBuildButton product={product} variant="compact" />
                </div>

                {/* Expandable retailer prices for grid view */}
                <AnimatePresence>
                    {showRetailers && hasMultipleRetailers && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">All prices:</p>
                                <div className="space-y-1">
                                    {sortedRetailers.map((retailer, index) => (
                                        <a
                                            key={`${retailer.name}-${index}`}
                                            href={retailer.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                                "flex items-center justify-between p-1.5 rounded-md border text-xs transition-colors",
                                                index === 0
                                                    ? "border-green-500/50 bg-green-500/5 hover:bg-green-500/10"
                                                    : "border-border/50 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                                                <span className="font-medium truncate">{retailer.name}</span>
                                                {!retailer.inStock && (
                                                    <span className="text-[9px] text-red-500 shrink-0">Out</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={cn(
                                                    "font-bold",
                                                    index === 0 ? "text-green-600 dark:text-green-400" : "text-foreground"
                                                )}>
                                                    {formatPrice(retailer.price)}
                                                </span>
                                                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
