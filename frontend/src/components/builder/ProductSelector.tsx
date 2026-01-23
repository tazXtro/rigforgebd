"use client"

import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, ExternalLink, Check, Store, X, Loader2, AlertTriangle, Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ComponentCategory, Product, ShopPrice } from "./types"
import { useBuilder } from "./BuilderContext"
import { cn } from "@/lib/utils"
import { fetchProducts, fetchCompatibleMotherboards, fetchCompatibleRAM } from "@/lib/productsApi"
import { Product as ApiProduct } from "@/components/products/ProductCard"

interface ProductSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ComponentCategory
  onSelect: (product: Product) => void
}

// Map builder categories to product API category slugs
const CATEGORY_SLUG_MAP: Record<ComponentCategory, string> = {
  CPU: "processors",
  Motherboard: "motherboards",
  RAM: "memory",
  Storage: "storage",
  GPU: "graphics-cards",
  PSU: "power-supply",
  Case: "cases",
  Cooler: "cooling",
  Monitor: "monitors",
}

// Transform API product to builder product format
function transformApiProduct(apiProduct: ApiProduct, category: ComponentCategory): Product {
  // Find min and max prices from retailers
  const prices = apiProduct.retailers.map(r => r.price)
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

  // Transform retailer data to shop prices
  const shopPrices: ShopPrice[] = apiProduct.retailers.map(retailer => ({
    shop: retailer.name,
    price: retailer.price,
    availability: retailer.inStock ? "in-stock" : "out-of-stock",
    url: retailer.url,
  }))

  return {
    id: apiProduct.id,
    name: apiProduct.name,
    brand: apiProduct.brand,
    image: apiProduct.image,
    category: category,
    specifications: apiProduct.specs || {},
    minPrice: minPrice,
    basePrice: maxPrice,
    prices: shopPrices,
  }
}

export function ProductSelector({
  open,
  onOpenChange,
  category,
  onSelect,
}: ProductSelectorProps) {
  const { addProductToSlot, getSelectedCPU, getSelectedMotherboard } = useBuilder()
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compatibility state
  const [compatibleIds, setCompatibleIds] = useState<Set<string> | null>(null)
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set())
  const [compatMode, setCompatMode] = useState<'strict' | 'lenient'>('strict')
  const [isLoadingCompat, setIsLoadingCompat] = useState(false)
  const [compatInfo, setCompatInfo] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch products when dialog opens or category/search changes
  const fetchCategoryProducts = async () => {
    const categorySlug = CATEGORY_SLUG_MAP[category]
    if (!categorySlug) {
      setError(`Unknown category: ${category}`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchProducts({
        category: categorySlug,
        search: debouncedSearch || undefined,
        page_size: 50, // Fetch more products for the selector
        grouped: true, // Get all retailers grouped under each product
      })

      // Transform API products to builder format
      const transformedProducts = response.products.map(p => transformApiProduct(p, category))
      setProducts(transformedProducts)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError("Failed to load products. Please try again.")
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch products when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategoryProducts()
    } else {
      // Reset state when dialog closes
      setSearchQuery("")
      setDebouncedSearch("")
      setSelectedProduct(null)
      setError(null)
      setCompatibleIds(null)
      setUnknownIds(new Set())
      setCompatInfo(null)
    }
  }, [open, category, debouncedSearch])

  // Fetch compatible IDs when selecting Motherboard or RAM
  useEffect(() => {
    const fetchCompatibility = async () => {
      if (category === 'Motherboard') {
        const cpu = getSelectedCPU()
        if (cpu) {
          setIsLoadingCompat(true)
          try {
            const compat = await fetchCompatibleMotherboards(cpu.id, compatMode)
            const allCompat = new Set(compat.compatible)
            const allUnknown = new Set(compat.unknown)
            setCompatibleIds(allCompat)
            setUnknownIds(allUnknown)
            if (compat.cpu?.socket) {
              setCompatInfo(`Showing motherboards compatible with ${compat.cpu.socket} socket`)
            }
          } catch (err) {
            console.error('Error fetching compatibility:', err)
            setCompatibleIds(null)
          } finally {
            setIsLoadingCompat(false)
          }
        } else {
          setCompatibleIds(null)
          setCompatInfo('Select a CPU first to see compatible motherboards')
        }
      } else if (category === 'RAM') {
        const mobo = getSelectedMotherboard()
        if (mobo) {
          setIsLoadingCompat(true)
          try {
            const compat = await fetchCompatibleRAM(mobo.id, compatMode)
            const allCompat = new Set(compat.compatible)
            const allUnknown = new Set(compat.unknown)
            setCompatibleIds(allCompat)
            setUnknownIds(allUnknown)
            if (compat.motherboard?.memory_type) {
              setCompatInfo(`Showing ${compat.motherboard.memory_type} RAM compatible with your motherboard`)
            }
          } catch (err) {
            console.error('Error fetching compatibility:', err)
            setCompatibleIds(null)
          } finally {
            setIsLoadingCompat(false)
          }
        } else {
          setCompatibleIds(null)
          setCompatInfo('Select a motherboard first to see compatible RAM')
        }
      } else {
        setCompatibleIds(null)
        setUnknownIds(new Set())
        setCompatInfo(null)
      }
    }

    if (open) {
      fetchCompatibility()
    }
  }, [open, category, compatMode, getSelectedCPU, getSelectedMotherboard])

  // Filter products client-side for instant search feedback
  const filteredProducts = useMemo(() => {
    let result = products

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return result
  }, [products, searchQuery])

  // Apply compatibility filter
  const compatFilteredProducts = useMemo(() => {
    if (!compatibleIds) return filteredProducts // No filter if no compatibility data

    if (compatMode === 'lenient') {
      // In lenient mode, show compatible + unknown products
      return filteredProducts.filter(
        (p) => compatibleIds.has(p.id) || unknownIds.has(p.id)
      )
    }

    // In strict mode, show only compatible products
    return filteredProducts.filter((p) => compatibleIds.has(p.id))
  }, [filteredProducts, compatibleIds, unknownIds, compatMode])

  // Check if a product has unknown compatibility
  const isUnknownCompat = (productId: string) => unknownIds.has(productId)

  const handleSelectProduct = (product: Product) => {
    addProductToSlot(category, product)
    onSelect(product)
    setSelectedProduct(null)
    setSearchQuery("")
    onOpenChange(false)
  }

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case "in-stock":
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">In Stock</Badge>
      case "out-of-stock":
        return <Badge variant="destructive">Out of Stock</Badge>
      case "pre-order":
        return <Badge variant="secondary">Pre-order</Badge>
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select {category}</DialogTitle>
          <DialogDescription>
            Browse and compare prices from different retailers
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${category.toLowerCase()}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Compatibility Info Bar */}
        {(category === 'Motherboard' || category === 'RAM') && (
          <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              {isLoadingCompat ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking compatibility...</span>
                </>
              ) : compatInfo ? (
                <>
                  <Shield className="h-4 w-4 text-primary" />
                  <span>{compatInfo}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>No compatibility filter active</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mode:</span>
              <div className="flex rounded-md border">
                <Button
                  size="sm"
                  variant={compatMode === 'strict' ? 'default' : 'ghost'}
                  className="h-7 px-3 rounded-r-none"
                  onClick={() => setCompatMode('strict')}
                >
                  Strict
                </Button>
                <Button
                  size="sm"
                  variant={compatMode === 'lenient' ? 'default' : 'ghost'}
                  className="h-7 px-3 rounded-l-none"
                  onClick={() => setCompatMode('lenient')}
                >
                  Lenient
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground">Loading {category}s...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-12 w-12 text-destructive mb-3" />
              <p className="text-destructive">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchCategoryProducts}
              >
                Try Again
              </Button>
            </div>
          ) : compatFilteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No compatible {category}s found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {compatibleIds && compatibleIds.size === 0
                  ? "Try switching to Lenient mode to see more options"
                  : searchQuery ? "Try adjusting your search" : "No products available in this category yet"}
              </p>
              {compatMode === 'strict' && compatibleIds && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setCompatMode('lenient')}
                >
                  Show All Products (Lenient Mode)
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <p className="text-sm text-muted-foreground">
                {compatFilteredProducts.length} compatible product{compatFilteredProducts.length !== 1 ? "s" : ""} found
                {compatibleIds && ` (${filteredProducts.length} total)`}
              </p>
              {compatFilteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "border rounded-lg p-4 transition-all",
                    selectedProduct?.id === product.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    isUnknownCompat(product.id) && "border-yellow-500/50 bg-yellow-500/5"
                  )}
                >
                  {/* Unknown compatibility warning */}
                  {isUnknownCompat(product.id) && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-yellow-600 dark:text-yellow-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Compatibility could not be verified</span>
                    </div>
                  )}
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">

                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.png"
                        }}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.brand}</p>

                      {/* Specifications */}
                      {Object.keys(product.specifications).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Price Range */}
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-lg font-bold text-primary">
                          ৳{product.minPrice.toLocaleString()}
                        </span>
                        {product.basePrice > product.minPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ৳{product.basePrice.toLocaleString()}
                          </span>
                        )}
                        {product.prices.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            from {product.prices.length} retailer{product.prices.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Select Button */}
                    <div className="flex-shrink-0">
                      <Button
                        onClick={() => handleSelectProduct(product)}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Select
                      </Button>
                    </div>
                  </div>

                  {/* Shop Prices */}
                  {selectedProduct?.id === product.id && product.prices.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <Separator className="mb-3" />
                      <p className="text-sm font-medium mb-2">Available at:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {product.prices
                          .sort((a, b) => a.price - b.price)
                          .map((priceInfo, index) => (
                            <div
                              key={`${priceInfo.shop}-${index}`}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-md border",
                                priceInfo.availability === "in-stock"
                                  ? "bg-background"
                                  : "bg-muted/50 opacity-70"
                              )}
                            >
                              <div>
                                <p className="text-sm font-medium">{priceInfo.shop}</p>
                                <p className="text-xs text-muted-foreground">
                                  ৳{priceInfo.price.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {getAvailabilityBadge(priceInfo.availability)}
                                {priceInfo.url && (
                                  <a
                                    href={priceInfo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}

                  {/* View Prices Button */}
                  {selectedProduct?.id !== product.id && product.prices.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => setSelectedProduct(product)}
                    >
                      View Prices at All Shops
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
