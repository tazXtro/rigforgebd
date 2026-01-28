"use client"

import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ComponentSlot } from "@/components/builder/types"
import { COMPONENT_CONFIGS, SHOPS } from "@/components/builder/constants"
import { cn } from "@/lib/utils"

interface BuildSystemViewProps {
    components: ComponentSlot[]
    totalPrice: number
}

export function BuildSystemView({ components, totalPrice }: BuildSystemViewProps) {
    // Get all unique retailers that have prices in this build
    const availableRetailers = SHOPS.filter((shop) => {
        return components.some((slot) => {
            if (!slot.product) return false
            const normalizedShopName = shop.name.toLowerCase().replace(/\s+/g, '')
            return slot.product.prices.some((p) => {
                const normalizedPriceName = p.shop.toLowerCase().replace(/\s+/g, '')
                return normalizedPriceName === normalizedShopName ||
                    normalizedPriceName.includes(normalizedShopName) ||
                    normalizedShopName.includes(normalizedPriceName)
            })
        })
    })

    // Get component for a category
    const getComponentForCategory = (category: string): ComponentSlot | undefined => {
        return components.find((slot) => slot.category === category && slot.product)
    }

    // Get shop price for a product
    const getShopPrice = (slot: ComponentSlot | undefined, shopName: string): number | null => {
        if (!slot?.product) return null

        const normalizedShopName = shopName.toLowerCase().replace(/\s+/g, '')
        const priceInfo = slot.product.prices.find((p) => {
            const normalizedPriceName = p.shop.toLowerCase().replace(/\s+/g, '')
            return normalizedPriceName === normalizedShopName ||
                normalizedPriceName.includes(normalizedShopName) ||
                normalizedShopName.includes(normalizedPriceName)
        })
        return priceInfo?.price || null
    }

    // Calculate totals
    const minPriceTotal = components.reduce((total, slot) => {
        if (slot.product) {
            return total + slot.product.minPrice * (slot.quantity || 1)
        }
        return total
    }, 0)

    const getShopTotal = (shopName: string): number => {
        return components.reduce((total, slot) => {
            const price = getShopPrice(slot, shopName)
            if (price) {
                return total + price * (slot.quantity || 1)
            }
            return total
        }, 0)
    }

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left p-4 font-semibold text-sm text-foreground min-w-[150px]">
                                Component
                            </th>
                            <th className="text-left p-4 font-semibold text-sm text-foreground min-w-[280px]">
                                Selection
                            </th>
                            <th className="text-center p-4 font-semibold text-sm text-foreground min-w-[100px]">
                                <Badge variant="secondary" className="font-normal bg-green-500/10 text-green-600">
                                    Price
                                </Badge>
                            </th>
                            {availableRetailers.map((shop) => (
                                <th
                                    key={shop.name}
                                    className="text-center p-4 font-semibold text-sm min-w-[100px] whitespace-nowrap"
                                >
                                    <div className="flex flex-col items-center justify-center w-full">
                                        <Badge variant="outline" className="font-normal">
                                            {shop.name === "Startech" ? "ST" :
                                                shop.name === "Techland" ? "TL" :
                                                    shop.name === "Potaka IT" ? "PI" :
                                                        shop.name === "Skyland" ? "SK" : "UT"}
                                        </Badge>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {shop.name}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {COMPONENT_CONFIGS.map((config, index) => {
                            const slot = getComponentForCategory(config.category)
                            const hasProduct = !!slot?.product

                            return (
                                <motion.tr
                                    key={config.category}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={cn(
                                        "border-b border-border transition-colors",
                                        hasProduct ? "bg-background" : "bg-muted/10"
                                    )}
                                >
                                    {/* Component Label */}
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground">
                                                {config.label}
                                            </span>
                                            {config.required && (
                                                <span className="text-xs text-destructive">*</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {config.description}
                                        </p>
                                    </td>

                                    {/* Selection */}
                                    <td className="p-4">
                                        {hasProduct ? (
                                            <div className="flex items-center gap-3">
                                                {slot.product?.image && (
                                                    <div className="relative h-12 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={slot.product.image}
                                                            alt={slot.product.name}
                                                            fill
                                                            className="object-contain p-1"
                                                        />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-foreground text-sm truncate">
                                                        {slot.product?.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {slot.product?.brand}
                                                        {(slot.quantity || 1) > 1 && (
                                                            <span className="ml-2 text-primary">
                                                                × {slot.quantity}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">
                                                Not included
                                            </span>
                                        )}
                                    </td>

                                    {/* Min Price */}
                                    <td className="text-center p-4">
                                        {hasProduct ? (
                                            <span className="font-medium text-green-600 dark:text-green-400">
                                                ৳{((slot.product?.minPrice || 0) * (slot.quantity || 1)).toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>

                                    {/* Shop Prices */}
                                    {availableRetailers.map((shop) => {
                                        const price = getShopPrice(slot, shop.name)
                                        const isLowest = price && slot?.product && price === slot.product.minPrice

                                        return (
                                            <td key={shop.name} className="text-center p-4">
                                                {price ? (
                                                    <span className={cn(
                                                        "text-sm",
                                                        isLowest
                                                            ? "font-semibold text-green-600 dark:text-green-400"
                                                            : "text-foreground"
                                                    )}>
                                                        ৳{(price * (slot?.quantity || 1)).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </td>
                                        )
                                    })}
                                </motion.tr>
                            )
                        })}

                        {/* Total Row */}
                        <tr className="border-t-2 border-border bg-muted/20">
                            <td className="p-4 font-semibold text-foreground" colSpan={2}>
                                Total:
                            </td>
                            <td className="text-center p-4 font-bold text-lg text-green-600 dark:text-green-400">
                                ৳{minPriceTotal.toLocaleString()}
                            </td>
                            {availableRetailers.map((shop) => {
                                const shopTotal = getShopTotal(shop.name)
                                return (
                                    <td
                                        key={shop.name}
                                        className="text-center p-4 text-foreground font-medium whitespace-nowrap"
                                    >
                                        {shopTotal > 0 ? `৳${shopTotal.toLocaleString()}` : '—'}
                                    </td>
                                )
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Retailer Links */}
            {availableRetailers.length > 0 && (
                <div className="p-4 border-t border-border bg-muted/10">
                    <p className="text-sm text-muted-foreground mb-3">
                        Buy from retailers:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableRetailers.map((shop) => (
                            <a
                                key={shop.name}
                                href={shop.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button variant="outline" size="sm" className="gap-2">
                                    {shop.name}
                                    <ExternalLink className="h-3 w-3" />
                                </Button>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
