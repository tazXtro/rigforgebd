"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Search, ExternalLink, Check, Store, X } from "lucide-react"
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
import { ComponentCategory, Product } from "@/types/builder"
import { useBuilder } from "@/contexts/BuilderContext"
import { cn } from "@/lib/utils"
import { SHOPS } from "@/constants/builder"

interface ProductSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ComponentCategory
  onSelect: (product: Product) => void
}

// Mock data - Replace with actual API call
const MOCK_PRODUCTS: Product[] = [
  // CPUs
  {
    id: "cpu-1",
    name: "Intel Core i5-13600K",
    brand: "Intel",
    image: "https://images.unsplash.com/photo-1555680202-c0f50942e9e9?w=400&h=400&fit=crop",
    category: "CPU",
    specifications: {
      Cores: "14",
      Threads: "20",
      "Base Clock": "3.5 GHz",
      "Boost Clock": "5.1 GHz",
    },
    minPrice: 28500,
    basePrice: 32000,
    prices: [
      { shop: "Star Tech", price: 29000, availability: "in-stock" },
      { shop: "Techland", price: 28500, availability: "in-stock" },
      { shop: "Potaka IT", price: 32000, availability: "out-of-stock" },
      { shop: "Skyland", price: 29500, availability: "pre-order" },
      { shop: "Ryans", price: 28800, availability: "in-stock" },
    ],
  },
  {
    id: "cpu-2",
    name: "AMD Ryzen 5 7600X",
    brand: "AMD",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop",
    category: "CPU",
    specifications: {
      Cores: "6",
      Threads: "12",
      "Base Clock": "4.7 GHz",
      "Boost Clock": "5.3 GHz",
    },
    minPrice: 25000,
    basePrice: 28000,
    prices: [
      { shop: "Star Tech", price: 25000, availability: "in-stock" },
      { shop: "Techland", price: 26000, availability: "in-stock" },
      { shop: "Potaka IT", price: 27500, availability: "pre-order" },
      { shop: "Skyland", price: 28000, availability: "in-stock" },
      { shop: "Ryans", price: 25500, availability: "in-stock" },
    ],
  },
  // Motherboards
  {
    id: "mobo-1",
    name: "ASUS ROG STRIX B650-A",
    brand: "ASUS",
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop",
    category: "Motherboard",
    specifications: {
      Socket: "AM5",
      Chipset: "B650",
      "Memory Slots": "4",
      "Max RAM": "128GB",
    },
    minPrice: 22500,
    basePrice: 25000,
    prices: [
      { shop: "Star Tech", price: 23000, availability: "in-stock" },
      { shop: "Techland", price: 22500, availability: "in-stock" },
      { shop: "Potaka IT", price: 24500, availability: "in-stock" },
      { shop: "Skyland", price: 25000, availability: "out-of-stock" },
      { shop: "Ryans", price: 23500, availability: "in-stock" },
    ],
  },
  // RAM
  {
    id: "ram-1",
    name: "Corsair Vengeance 16GB DDR5",
    brand: "Corsair",
    image: "https://images.unsplash.com/photo-1541348263662-e068662d82af?w=400&h=400&fit=crop",
    category: "RAM",
    specifications: {
      Capacity: "16GB",
      Type: "DDR5",
      Speed: "6000MHz",
      "CAS Latency": "CL30",
    },
    minPrice: 8500,
    basePrice: 9500,
    prices: [
      { shop: "Star Tech", price: 8500, availability: "in-stock" },
      { shop: "Techland", price: 8800, availability: "in-stock" },
      { shop: "Potaka IT", price: 9200, availability: "in-stock" },
      { shop: "Skyland", price: 9500, availability: "in-stock" },
      { shop: "Ryans", price: 8700, availability: "in-stock" },
    ],
  },
  // Storage
  {
    id: "storage-1",
    name: "Samsung 980 Pro 1TB NVMe",
    brand: "Samsung",
    image: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=400&h=400&fit=crop",
    category: "Storage",
    specifications: {
      Capacity: "1TB",
      Type: "NVMe SSD",
      Interface: "PCIe 4.0",
      Speed: "7000MB/s",
    },
    minPrice: 12500,
    basePrice: 14000,
    prices: [
      { shop: "Star Tech", price: 13000, availability: "in-stock" },
      { shop: "Techland", price: 12500, availability: "in-stock" },
      { shop: "Potaka IT", price: 13500, availability: "in-stock" },
      { shop: "Skyland", price: 14000, availability: "out-of-stock" },
      { shop: "Ryans", price: 12800, availability: "in-stock" },
    ],
  },
  // GPU
  {
    id: "gpu-1",
    name: "NVIDIA RTX 4060 Ti 8GB",
    brand: "NVIDIA",
    image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=400&fit=crop",
    category: "GPU",
    specifications: {
      Memory: "8GB GDDR6",
      "CUDA Cores": "4352",
      "Boost Clock": "2.54 GHz",
      TDP: "160W",
    },
    minPrice: 48000,
    basePrice: 52000,
    prices: [
      { shop: "Star Tech", price: 49000, availability: "in-stock" },
      { shop: "Techland", price: 48000, availability: "in-stock" },
      { shop: "Potaka IT", price: 51000, availability: "pre-order" },
      { shop: "Skyland", price: 52000, availability: "in-stock" },
      { shop: "Ryans", price: 48500, availability: "in-stock" },
    ],
  },
  // PSU
  {
    id: "psu-1",
    name: "Corsair RM750e 750W 80+ Gold",
    brand: "Corsair",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
    category: "PSU",
    specifications: {
      Wattage: "750W",
      Efficiency: "80+ Gold",
      Modular: "Fully",
      Rails: "+12V",
    },
    minPrice: 9500,
    basePrice: 11000,
    prices: [
      { shop: "Star Tech", price: 9800, availability: "in-stock" },
      { shop: "Techland", price: 9500, availability: "in-stock" },
      { shop: "Potaka IT", price: 10500, availability: "in-stock" },
      { shop: "Skyland", price: 11000, availability: "in-stock" },
      { shop: "Ryans", price: 9700, availability: "in-stock" },
    ],
  },
  // Case
  {
    id: "case-1",
    name: "NZXT H510 Flow ATX",
    brand: "NZXT",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop",
    category: "Case",
    specifications: {
      "Form Factor": "ATX",
      Color: "Black",
      "Side Panel": "Tempered Glass",
      "Fan Support": "6x 120mm",
    },
    minPrice: 6500,
    basePrice: 7500,
    prices: [
      { shop: "Star Tech", price: 6800, availability: "in-stock" },
      { shop: "Techland", price: 6500, availability: "in-stock" },
      { shop: "Potaka IT", price: 7200, availability: "in-stock" },
      { shop: "Skyland", price: 7500, availability: "in-stock" },
      { shop: "Ryans", price: 6700, availability: "in-stock" },
    ],
  },
  // Cooler
  {
    id: "cooler-1",
    name: "Cooler Master Hyper 212 RGB",
    brand: "Cooler Master",
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop",
    category: "Cooler",
    specifications: {
      Type: "Tower Air",
      Height: "159mm",
      TDP: "180W",
      RGB: "Yes",
    },
    minPrice: 3500,
    basePrice: 4200,
    prices: [
      { shop: "Star Tech", price: 3600, availability: "in-stock" },
      { shop: "Techland", price: 3500, availability: "in-stock" },
      { shop: "Potaka IT", price: 3900, availability: "in-stock" },
      { shop: "Skyland", price: 4200, availability: "in-stock" },
      { shop: "Ryans", price: 3550, availability: "in-stock" },
    ],
  },
  // Monitor
  {
    id: "monitor-1",
    name: "ASUS TUF Gaming 27\" 165Hz",
    brand: "ASUS",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop",
    category: "Monitor",
    specifications: {
      Size: "27 inch",
      Resolution: "2560x1440",
      "Refresh Rate": "165Hz",
      Panel: "IPS",
    },
    minPrice: 28000,
    basePrice: 32000,
    prices: [
      { shop: "Star Tech", price: 29000, availability: "in-stock" },
      { shop: "Techland", price: 28000, availability: "in-stock" },
      { shop: "Potaka IT", price: 31000, availability: "in-stock" },
      { shop: "Skyland", price: 32000, availability: "out-of-stock" },
      { shop: "Ryans", price: 28500, availability: "in-stock" },
    ],
  },
]

export function ProductSelector({
  open,
  onOpenChange,
  category,
  onSelect,
}: ProductSelectorProps) {
  const { addProductToSlot } = useBuilder()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(
      (product) =>
        product.category === category &&
        (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [category, searchQuery])

  const handleSelectProduct = (product: Product) => {
    addProductToSlot(category, product)
    onSelect(product)
    setSelectedProduct(null)
    setSearchQuery("")
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
            placeholder="Search products..."
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

        {/* Products List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "border rounded-lg p-4 transition-all",
                    selectedProduct?.id === product.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.brand}</p>

                      {/* Specifications */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>

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
                  {selectedProduct?.id === product.id && (
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
                          .map((priceInfo) => (
                            <div
                              key={priceInfo.shop}
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
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}

                  {/* View Prices Button */}
                  {selectedProduct?.id !== product.id && (
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
