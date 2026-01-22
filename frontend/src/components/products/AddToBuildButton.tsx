"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { motion } from "framer-motion"
import { useBuilder } from "@/components/builder/BuilderContext"
import { getBuilderCategory } from "@/components/builder/categoryMapping"
import { ComponentCategory, Product as BuilderProduct, ShopPrice } from "@/components/builder/types"
import { Product as ProductCardProduct } from "./ProductCard"
import { cn } from "@/lib/utils"

interface AddToBuildButtonProps {
    product: ProductCardProduct
    variant?: "compact" | "full"
    className?: string
}

/**
 * Transform a ProductCard product to Builder product format
 */
function transformToBuilderProduct(
    product: ProductCardProduct,
    category: ComponentCategory
): BuilderProduct {
    const prices = product.retailers.map(r => r.price)
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

    const shopPrices: ShopPrice[] = product.retailers.map(retailer => ({
        shop: retailer.name,
        price: retailer.price,
        availability: retailer.inStock ? "in-stock" : "out-of-stock",
        url: retailer.url,
    }))

    return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        image: product.image,
        category: category,
        specifications: product.specs || {},
        minPrice: minPrice,
        basePrice: maxPrice,
        prices: shopPrices,
    }
}

export function AddToBuildButton({
    product,
    variant = "full",
    className,
}: AddToBuildButtonProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { addProductToSlot } = useBuilder()

    // Check if user navigated from system builder
    const isFromBuilder = searchParams.get("source") === "builder"

    // Get builder category from product's category slug
    const builderCategory = getBuilderCategory(product.categorySlug)

    const handleAddToBuild = () => {
        if (!builderCategory) {
            console.warn(`Unknown category slug: ${product.categorySlug}`)
            return
        }

        // Transform product to builder format and add to slot
        const builderProduct = transformToBuilderProduct(product, builderCategory)
        addProductToSlot(builderCategory, builderProduct)

        // Navigate to builder
        router.push("/builder")
    }

    // Don't render if category is not mappable to builder
    if (!builderCategory) {
        return null
    }

    return (
        <motion.button
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddToBuild()
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                // Base styles
                "group relative inline-flex items-center justify-center gap-1.5 overflow-hidden",
                "rounded-lg font-semibold text-sm",
                "transition-all duration-200 ease-out",
                // Sizing based on variant
                variant === "compact"
                    ? "px-3 py-1.5"
                    : "px-4 py-2",
                // Primary theme styling (matching grid/list buttons)
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "shadow-sm hover:shadow-md",
                "active:bg-primary/80",
                className
            )}
        >
            {/* Glossy shine effect on hover */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-500 ease-out" />

            <Plus className={cn(
                "relative z-10",
                variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
            <span className="relative z-10">Add</span>
        </motion.button>
    )
}
