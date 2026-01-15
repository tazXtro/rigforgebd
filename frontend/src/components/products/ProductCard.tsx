"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    ExternalLink,
    Heart,
    TrendingDown,
    Store,
    Package,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProductRetailer {
    name: string
    price: number
    inStock: boolean
    url: string
}

export interface Product {
    id: string
    name: string
    slug: string
    category: string
    categorySlug: string
    image: string
    retailers: ProductRetailer[]
    brand: string
    specs?: Record<string, string>
}

interface ProductCardProps {
    product: Product
    viewMode?: "grid" | "list"
}

export function ProductCard({ product, viewMode = "grid" }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)

    // Find lowest and highest prices
    const prices = product.retailers.map(r => r.price)
    const lowestPrice = Math.min(...prices)
    const highestPrice = Math.max(...prices)
    const lowestRetailer = product.retailers.find(r => r.price === lowestPrice)
    const inStockCount = product.retailers.filter(r => r.inStock).length
    const hasMultiplePrices = prices.length > 1 && lowestPrice !== highestPrice

    // Format price with Taka symbol
    const formatPrice = (price: number) => {
        return `৳${price.toLocaleString("en-BD")}`
    }

    if (viewMode === "list") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex gap-4 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
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

                    <div className="mt-3 flex items-center gap-4">
                        <div>
                            <p className="text-xl font-bold text-primary">{formatPrice(lowestPrice)}</p>
                            {hasMultiplePrices && (
                                <p className="text-xs text-muted-foreground">
                                    up to {formatPrice(highestPrice)}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Store className="w-4 h-4" />
                            <span>{product.retailers.length} retailers</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4" />
                            <span className={inStockCount > 0 ? "text-green-600" : "text-red-500"}>
                                {inStockCount > 0 ? `${inStockCount} in stock` : "Out of stock"}
                            </span>
                        </div>
                    </div>
                </div>

                <Link
                    href={`/products/${product.categorySlug}/${product.slug}`}
                    className="self-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    Compare Prices
                </Link>
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
                    <h3 className="font-medium text-sm text-foreground hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem]">
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

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Store className="w-3 h-3" />
                        <span>{product.retailers.length}</span>
                    </div>
                </div>

                {/* Stock Status */}
                <div className="mt-2 pt-2 border-t border-border/50">
                    <p className={cn(
                        "text-xs font-medium",
                        inStockCount > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                    )}>
                        {inStockCount > 0 ? `${inStockCount} store${inStockCount > 1 ? "s" : ""} have stock` : "Out of stock"}
                    </p>
                </div>
            </div>
        </motion.div>
    )
}
