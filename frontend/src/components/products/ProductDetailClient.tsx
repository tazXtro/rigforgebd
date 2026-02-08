"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
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
    TrendingDown,
    Shield,
    Trash2,
    Plus,
    Loader2,
} from "lucide-react"
import { Product } from "./ProductCard"
import { ProductBuilds } from "./ProductBuilds"
import { EditableField } from "./EditableField"
import { EditableSpecs } from "./EditableSpecs"
import { cn } from "@/lib/utils"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { createProductApi, ProductApi } from "@/lib/adminProductApi"

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

export function ProductDetailClient({ product: initialProduct }: ProductDetailClientProps) {
    const [product, setProduct] = useState(initialProduct)
    const [isFavorite, setIsFavorite] = useState(false)
    const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [specsOpen, setSpecsOpen] = useState(true)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()
    const { getToken } = useAuth()

    // Admin check
    const { isAdmin } = useIsAdmin()

    // Create JWT-authenticated product API
    const productApi = useMemo(() => {
        if (!getToken) return null
        return createProductApi(getToken)
    }, [getToken])

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

    // ========== Admin Edit Handlers ==========
    const handleUpdateField = useCallback(
        async (field: string, newValue: string): Promise<{ error?: string }> => {
            if (!productApi) return { error: "Not authenticated" }
            const result = await productApi.updateProduct(product.id, {
                [field]: newValue,
            })
            if (result.error) return { error: result.error }
            if (result.product) {
                setProduct((prev) => ({
                    ...prev,
                    name: result.product!.name ?? prev.name,
                    brand: result.product!.brand ?? prev.brand,
                    category: result.product!.category ?? prev.category,
                    image: result.product!.image_url ?? prev.image,
                }))
            }
            return {}
        },
        [product.id, productApi]
    )

    const handleUpdateSpecs = useCallback(
        async (newSpecs: Record<string, string>): Promise<{ error?: string }> => {
            if (!productApi) return { error: "Not authenticated" }
            const result = await productApi.updateSpecs(product.id, {
                specs: newSpecs,
            })
            if (result.error) return { error: result.error }
            setProduct((prev) => ({ ...prev, specs: result.specs || newSpecs }))
            return {}
        },
        [product.id, productApi]
    )

    const handleUpdatePrice = useCallback(
        async (priceId: string, field: string, newValue: string): Promise<{ error?: string }> => {
            if (!productApi) return { error: "Not authenticated" }
            const payload: Record<string, unknown> = {}
            if (field === "price") payload.price = parseFloat(newValue)
            else payload[field] = newValue

            // We need the price_id — however the current Product type doesn't carry it.
            // We use the retailer index to construct a PATCH. For now, use product-level price endpoint.
            const result = await productApi.updatePrice(product.id, priceId, payload as any)
            if (result.error) return { error: result.error }
            return {}
        },
        [product.id, productApi]
    )

    const handleDelete = useCallback(async () => {
        if (!productApi) return
        if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return
        setIsDeleting(true)
        const result = await productApi.deleteProduct(product.id)
        setIsDeleting(false)
        if (result.error) {
            alert(result.error)
            return
        }
        router.push(`/products/${product.categorySlug}`)
    }, [product.id, product.categorySlug, productApi, router])

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            {/* Header / Breadcrumb */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
                <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link
                        href={`/products/${product.categorySlug}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to {product.category}
                    </Link>

                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30 gap-1">
                                <Shield className="w-3 h-3" />
                                Admin Edit Mode
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 gap-1"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Delete
                            </Button>
                        </div>
                    )}
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
                                {isAdmin && (
                                    <div className="p-3 border-t bg-muted/30">
                                        <EditableField
                                            value={product.image || ""}
                                            editable={true}
                                            label="Image URL"
                                            inputType="url"
                                            onSave={(v) => handleUpdateField("image_url", v)}
                                            renderDisplay={(v) => (
                                                <span className="text-xs text-muted-foreground truncate max-w-full block">
                                                    {v ? "Image URL set" : "No image URL"}
                                                </span>
                                            )}
                                        />
                                    </div>
                                )}
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
                                <EditableField
                                    value={product.brand || ""}
                                    editable={isAdmin}
                                    label="Brand"
                                    onSave={(v) => handleUpdateField("brand", v)}
                                    renderDisplay={(v) => (
                                        <h2 className="text-sm font-medium text-primary mb-1 tracking-wide uppercase">{v}</h2>
                                    )}
                                    className="mb-1"
                                />
                                <EditableField
                                    value={product.name}
                                    editable={isAdmin}
                                    label="Product Name"
                                    onSave={(v) => handleUpdateField("name", v)}
                                    renderDisplay={(v) => (
                                        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                                            {v}
                                        </h1>
                                    )}
                                />
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
                                        <RetailerRow
                                            key={retailer.priceId || idx}
                                            retailer={retailer}
                                            idx={idx}
                                            lowestPrice={lowestPrice}
                                            formatPrice={formatPrice}
                                            isAdmin={isAdmin}
                                            productId={product.id}
                                            productApi={productApi}
                                            onPriceUpdated={(priceId, newPrice, newInStock) => {
                                                setProduct((prev) => ({
                                                    ...prev,
                                                    retailers: prev.retailers.map((r) =>
                                                        r.priceId === priceId
                                                            ? { ...r, price: newPrice ?? r.price, inStock: newInStock ?? r.inStock }
                                                            : r
                                                    ),
                                                }))
                                            }}
                                        />
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
                                                <EditableSpecs
                                                    specs={product.specs}
                                                    onSave={handleUpdateSpecs}
                                                    editable={isAdmin}
                                                />
                                            </CardContent>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>
                        ) : (
                            <Card className={cn("overflow-hidden", isAdmin ? "border-dashed border-primary/30" : "bg-muted/30 border-dashed")}>
                                {isAdmin ? (
                                    <>
                                        <div className="p-4 flex items-center justify-between border-b">
                                            <div className="flex items-center gap-2 font-semibold text-lg">
                                                <Info className="w-5 h-5 text-muted-foreground" />
                                                Technical Specifications
                                            </div>
                                        </div>
                                        <CardContent className="p-0">
                                            <EditableSpecs
                                                specs={{}}
                                                onSave={handleUpdateSpecs}
                                                editable={true}
                                            />
                                        </CardContent>
                                    </>
                                ) : (
                                    <CardContent className="h-32 flex flex-col items-center justify-center text-muted-foreground">
                                        <Info className="w-8 h-8 mb-2 opacity-20" />
                                        <p>Specifications not available</p>
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        {/* Builds Using This Product */}
                        <ProductBuilds productName={product.name} />
                    </div>
                </div>
            </main>
        </div>
    )
}
/* ================================================================
   RetailerRow — renders a single retailer with optional admin editing
   ================================================================ */

import { ProductRetailer } from "./ProductCard"

interface RetailerRowProps {
    retailer: ProductRetailer
    idx: number
    lowestPrice: number
    formatPrice: (n: number) => string
    isAdmin: boolean
    productId: string
    productApi: ProductApi | null
    onPriceUpdated: (priceId: string, newPrice?: number, newInStock?: boolean) => void
}

function RetailerRow({
    retailer,
    idx,
    lowestPrice,
    formatPrice,
    isAdmin,
    productId,
    productApi,
    onPriceUpdated,
}: RetailerRowProps) {
    const [isTogglingStock, setIsTogglingStock] = useState(false)

    const handleToggleStock = async () => {
        if (!retailer.priceId || !productApi) return
        setIsTogglingStock(true)
        const newInStock = !retailer.inStock
        const result = await productApi.updatePrice(productId, retailer.priceId, {
            in_stock: newInStock,
        })
        setIsTogglingStock(false)
        if (!result.error) {
            onPriceUpdated(retailer.priceId, undefined, newInStock)
        }
    }

    return (
        <div
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
                    {isAdmin && retailer.priceId ? (
                        <button
                            onClick={handleToggleStock}
                            disabled={isTogglingStock}
                            className={cn(
                                "flex items-center gap-1.5 font-medium cursor-pointer hover:opacity-80 transition-opacity",
                                retailer.inStock ? "text-green-600 dark:text-green-500" : "text-red-500"
                            )}
                            title="Click to toggle stock status"
                        >
                            {isTogglingStock ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : retailer.inStock ? (
                                <Package className="w-3.5 h-3.5" />
                            ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                            )}
                            {retailer.inStock ? "In Stock" : "Out of Stock"}
                        </button>
                    ) : (
                        <span className={cn(
                            "flex items-center gap-1.5 font-medium",
                            retailer.inStock ? "text-green-600 dark:text-green-500" : "text-red-500"
                        )}>
                            {retailer.inStock ? <Package className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {retailer.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                <div className="text-right">
                    {isAdmin && retailer.priceId && productApi ? (
                        <EditableField
                            value={String(retailer.price)}
                            editable={true}
                            label="Price"
                            inputType="number"
                            onSave={async (newValue) => {
                                const parsed = parseFloat(newValue)
                                if (isNaN(parsed) || parsed < 0) return { error: "Invalid price" }
                                const result = await productApi.updatePrice(productId, retailer.priceId!, {
                                    price: parsed,
                                })
                                if (result.error) return { error: result.error }
                                onPriceUpdated(retailer.priceId!, parsed, undefined)
                                return {}
                            }}
                            renderDisplay={(v) => (
                                <div>
                                    <div className="font-bold text-lg">{formatPrice(Number(v))}</div>
                                    {idx > 0 && Number(v) > lowestPrice && (
                                        <div className="text-xs text-muted-foreground">
                                            +{formatPrice(Number(v) - lowestPrice)}
                                        </div>
                                    )}
                                </div>
                            )}
                        />
                    ) : (
                        <>
                            <div className="font-bold text-lg">{formatPrice(retailer.price)}</div>
                            {idx > 0 && retailer.price > lowestPrice && (
                                <div className="text-xs text-muted-foreground">
                                    +{formatPrice(retailer.price - lowestPrice)}
                                </div>
                            )}
                        </>
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
    )
}