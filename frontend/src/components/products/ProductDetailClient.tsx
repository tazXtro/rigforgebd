"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
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
    AlertCircle,
    Info,
    TrendingDown
} from "lucide-react"
import { Product } from "./ProductCard"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface ProductDetailClientProps {
    product: Product
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
    const [isFavorite, setIsFavorite] = useState(false)
    const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [specsOpen, setSpecsOpen] = useState(true)

    // Format price with Taka symbol
    const formatPrice = (price: number) => `৳${price.toLocaleString("en-BD")}`

    // Find lowest and highest prices
    const prices = product.retailers.map(r => r.price)
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0
    const lowestRetailer = product.retailers.find(r => r.price === lowestPrice)
    const savings = highestPrice - lowestPrice

    // Sort retailers by price
    const sortedRetailers = [...product.retailers].sort((a, b) => a.price - b.price);

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
        <div className="min-h-screen bg-muted/10 pb-12">
            {/* Header / Breadcrumb */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
                <div className="container max-w-7xl mx-auto px-4 py-3">
                    <Link
                        href={`/products/${product.categorySlug}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to {product.category}
                    </Link>
                </div>
            </div>

            <main className="container max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Image & Actions (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="sticky top-24 space-y-6">
                            <Card className="overflow-hidden border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                                <div className="relative aspect-square p-6 flex items-center justify-center bg-white dark:bg-muted/20">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 hover:scale-105"
                                    />
                                    {savings > 0 && (
                                        <Badge className="absolute top-4 left-4 bg-green-500 hover:bg-green-600 text-white border-0 px-3 py-1 text-sm font-medium">
                                            Save {formatPrice(savings)}
                                        </Badge>
                                    )}
                                </div>
                            </Card>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant={isFavorite ? "default" : "outline"}
                                    className={cn(
                                        "w-full gap-2 transition-all",
                                        isFavorite && "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                    )}
                                    onClick={() => setIsFavorite(!isFavorite)}
                                >
                                    <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                                    {isFavorite ? "Saved" : "Save"}
                                </Button>

                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full gap-2 transition-all",
                                        shareStatus === 'success' && "border-green-500 text-green-500 bg-green-50 dark:bg-green-500/10"
                                    )}
                                    onClick={handleShare}
                                >
                                    {shareStatus === 'success' ? (
                                        <>
                                            <Check className="w-4 h-4" /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="w-4 h-4" /> Share
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Details (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Title & Price Header */}
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-sm font-medium text-primary mb-1 tracking-wide uppercase">{product.brand}</h2>
                                <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                                    {product.name}
                                </h1>
                            </div>

                            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
                                <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium mb-1">Best Market Price</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-bold text-primary">
                                                {formatPrice(lowestPrice)}
                                            </span>
                                            {highestPrice > lowestPrice && (
                                                <span className="text-lg text-muted-foreground line-through decoration-red-500/50">
                                                    {formatPrice(highestPrice)}
                                                </span>
                                            )}
                                        </div>
                                        {lowestRetailer && (
                                            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                                                <TrendingDown className="w-4 h-4 text-green-500" />
                                                Lowest price at <span className="font-semibold text-foreground">{lowestRetailer.name}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant="outline" className="px-3 py-1 bg-background">
                                            {product.retailers.length} Sellers
                                        </Badge>
                                        <Badge variant={lowestRetailer?.inStock ? "default" : "destructive"} className="px-3 py-1">
                                            {lowestRetailer?.inStock ? "In Stock" : "Out of Stock"}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Retailers List */}
                        <Card>
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Store className="w-5 h-5 text-muted-foreground" />
                                    Available Retailers
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {sortedRetailers.map((retailer, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors",
                                                idx === 0 && "bg-primary/5"
                                            )}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-base truncate">{retailer.name}</span>
                                                    {idx === 0 && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                                                            Best Price
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span className={cn(
                                                        "flex items-center gap-1.5 font-medium",
                                                        retailer.inStock ? "text-green-600 dark:text-green-500" : "text-red-500"
                                                    )}>
                                                        {retailer.inStock ? <Package className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                                        {retailer.inStock ? "In Stock" : "Out of Stock"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                                <div className="text-right">
                                                    <div className="font-bold text-lg">{formatPrice(retailer.price)}</div>
                                                    {idx > 0 && retailer.price > lowestPrice && (
                                                        <div className="text-xs text-muted-foreground">
                                                            +{formatPrice(retailer.price - lowestPrice)}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant={retailer.inStock ? "default" : "secondary"}
                                                    className={cn("w-28", !retailer.inStock && "opacity-70")}
                                                >
                                                    <a href={retailer.url} target="_blank" rel="noopener noreferrer">
                                                        {retailer.inStock ? "Buy Now" : "Check"} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Specifications */}
                        {product.specs && Object.keys(product.specs).length > 0 ? (
                            <Card className="overflow-hidden">
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors border-b"
                                    onClick={() => setSpecsOpen(!specsOpen)}
                                >
                                    <div className="flex items-center gap-2 font-semibold text-lg">
                                        <Info className="w-5 h-5 text-muted-foreground" />
                                        Technical Specifications
                                    </div>
                                    <Button variant="ghost" size="sm" className="w-9 h-9 p-0 rounded-full">
                                        {specsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </div>

                                <AnimatePresence initial={false}>
                                    {specsOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <CardContent className="p-0">
                                                <div className="grid grid-cols-1 divide-y">
                                                    {Object.entries(product.specs).map(([key, value], i) => (
                                                        <div key={key} className="grid grid-cols-3 p-4 gap-4 hover:bg-muted/20">
                                                            <div className="col-span-1 text-sm font-medium text-muted-foreground">
                                                                {key}
                                                            </div>
                                                            <div className="col-span-2 text-sm font-medium text-foreground">
                                                                {value}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>
                        ) : (
                            <Card className="bg-muted/30 border-dashed">
                                <CardContent className="h-32 flex flex-col items-center justify-center text-muted-foreground">
                                    <Info className="w-8 h-8 mb-2 opacity-20" />
                                    <p>Specifications not available</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
