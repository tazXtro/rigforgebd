"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    ArrowLeft,
    ExternalLink,
    Store,
    Package,
    Heart,
    Share2,
    ChevronDown,
    ChevronUp,
    Check,
    AlertCircle
} from "lucide-react"
import { Product } from "./ProductCard"
import { cn } from "@/lib/utils"

interface ProductDetailClientProps {
    product: Product
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
    const [isFavorite, setIsFavorite] = useState(false)
    const [expandedSpecs, setExpandedSpecs] = useState(true)
    const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle')

    // Format price with Taka symbol
    const formatPrice = (price: number) => `৳${price.toLocaleString("en-BD")}`

    // Find lowest and highest prices
    const prices = product.retailers.map(r => r.price)
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0
    const lowestRetailer = product.retailers.find(r => r.price === lowestPrice)
    const savings = highestPrice - lowestPrice

    // Handle share functionality
    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: product.name,
                    text: `Check out ${product.name} on RigForgeBD`,
                    url: window.location.href
                })
                setShareStatus('success')
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(window.location.href)
                setShareStatus('success')
            }
            setTimeout(() => setShareStatus('idle'), 2000)
        } catch {
            setShareStatus('error')
            setTimeout(() => setShareStatus('idle'), 2000)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header with back button */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="container mx-auto px-4 py-4">
                    <Link
                        href={`/products/${product.categorySlug}`}
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to {product.category}
                    </Link>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Left Column: Image */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative"
                    >
                        <div className="sticky top-24">
                            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />

                                {/* Price comparison badge */}
                                {savings > 0 && (
                                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium">
                                        Save up to {formatPrice(savings)}
                                    </div>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => setIsFavorite(!isFavorite)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors",
                                        isFavorite
                                            ? "border-red-500 bg-red-500/10 text-red-500"
                                            : "border-border hover:border-primary"
                                    )}
                                >
                                    <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                                    {isFavorite ? "Saved" : "Save"}
                                </button>
                                <button
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors",
                                        shareStatus === 'success' && "border-green-500 bg-green-500/10 text-green-500",
                                        shareStatus === 'idle' && "border-border hover:border-primary"
                                    )}
                                    onClick={handleShare}
                                >
                                    {shareStatus === 'success' ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="w-5 h-5" />
                                            Share
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Details */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                    >
                        {/* Product Info */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">{product.brand}</p>
                            <h1 className="text-3xl font-bold text-foreground mb-4">
                                {product.name}
                            </h1>

                            {/* Best Price Highlight */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                                <p className="text-sm text-muted-foreground mb-1">Best Price</p>
                                <p className="text-4xl font-bold text-primary">
                                    {formatPrice(lowestPrice)}
                                </p>
                                {lowestRetailer && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        at {lowestRetailer.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Retailers Section */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Store className="w-5 h-5" />
                                Available at {product.retailers.length} Retailer{product.retailers.length > 1 ? 's' : ''}
                            </h2>

                            <div className="space-y-3">
                                {product.retailers
                                    .sort((a, b) => a.price - b.price)
                                    .map((retailer, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-xl border transition-all",
                                                idx === 0
                                                    ? "border-primary/50 bg-primary/5"
                                                    : "border-border hover:border-primary/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                {idx === 0 && (
                                                    <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">
                                                        Best Price
                                                    </span>
                                                )}
                                                <div>
                                                    <p className="font-medium">{retailer.name}</p>
                                                    <p className={cn(
                                                        "text-sm flex items-center gap-1",
                                                        retailer.inStock ? "text-green-600" : "text-red-500"
                                                    )}>
                                                        {retailer.inStock ? (
                                                            <><Package className="w-3 h-3" /> In Stock</>
                                                        ) : (
                                                            <><AlertCircle className="w-3 h-3" /> Out of Stock</>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-xl font-bold">
                                                        {formatPrice(retailer.price)}
                                                    </p>
                                                    {idx > 0 && retailer.price > lowestPrice && (
                                                        <p className="text-xs text-muted-foreground">
                                                            +{formatPrice(retailer.price - lowestPrice)}
                                                        </p>
                                                    )}
                                                </div>

                                                <a
                                                    href={retailer.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={cn(
                                                        "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors",
                                                        retailer.inStock
                                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                                    )}
                                                >
                                                    {retailer.inStock ? "Buy Now" : "View"}
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        </div>

                        {/* Specifications Section */}
                        {product.specs && Object.keys(product.specs).length > 0 && (
                            <div className="border border-border rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedSpecs(!expandedSpecs)}
                                    className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <h2 className="text-xl font-semibold">Specifications</h2>
                                    {expandedSpecs ? (
                                        <ChevronUp className="w-5 h-5" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5" />
                                    )}
                                </button>

                                {expandedSpecs && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="p-4"
                                    >
                                        <dl className="divide-y divide-border">
                                            {Object.entries(product.specs).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="flex justify-between py-3 gap-4"
                                                >
                                                    <dt className="text-muted-foreground flex-shrink-0">
                                                        {key}
                                                    </dt>
                                                    <dd className="font-medium text-right">
                                                        {value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* No specs message */}
                        {(!product.specs || Object.keys(product.specs).length === 0) && (
                            <div className="p-6 bg-muted/30 rounded-2xl text-center">
                                <p className="text-muted-foreground">
                                    Specifications not yet available for this product.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    )
}
