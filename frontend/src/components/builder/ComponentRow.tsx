"use client"

import { useRouter } from "next/navigation"
import { Plus, ChevronDown, Trash2, Check, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ComponentConfig } from "./types"
import { useBuilder } from "./BuilderContext"
import { SHOPS } from "./constants"
import { getProductCategorySlug } from "./categoryMapping"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ComponentRowProps {
  config: ComponentConfig
  index: number
}

export function ComponentRow({ config, index }: ComponentRowProps) {
  const router = useRouter()
  const { getSlotsForCategory, removeSlot, selectSlot, setSlotQuantity, setSlotRetailer, selectedRetailers, getSelectedCPU, getSelectedMotherboard } = useBuilder()
  const slots = getSlotsForCategory(config.category)
  const selectedSlot = slots.find((s) => s.isSelected)

  const handleOpenSelector = () => {
    // Navigate to products page with source=builder to indicate selection mode
    const categorySlug = getProductCategorySlug(config.category)
    const params = new URLSearchParams({ source: "builder" })

    if (config.category === "Motherboard") {
      const cpu = getSelectedCPU()
      if (cpu?.id) {
        params.set("cpu_id", cpu.id)
        params.set("compat_mode", "strict")
      }
    }

    if (config.category === "RAM") {
      const motherboard = getSelectedMotherboard()
      if (motherboard?.id) {
        params.set("motherboard_id", motherboard.id)
        params.set("compat_mode", "strict")
      }
    }

    router.push(`/products/${categorySlug}?${params.toString()}`)
  }

  // Calculate shop prices for selected product
  // Uses flexible matching to handle name variations (e.g., "Techland" vs "Tech Land")
  const getShopPrice = (shopName: string) => {
    if (!selectedSlot?.product) return null

    // Normalize shop name for comparison (lowercase, remove spaces)
    const normalizedShopName = shopName.toLowerCase().replace(/\s+/g, '')

    const priceInfo = selectedSlot.product.prices.find((p) => {
      const normalizedPriceName = p.shop.toLowerCase().replace(/\s+/g, '')
      return normalizedPriceName === normalizedShopName ||
        normalizedPriceName.includes(normalizedShopName) ||
        normalizedShopName.includes(normalizedPriceName)
    })
    return priceInfo?.price
  }

  // Get the base price (from selected retailer, or minPrice if none selected)
  const getBasePrice = () => {
    if (!selectedSlot?.product) return null

    if (selectedSlot.selectedRetailer) {
      const normalizedRetailer = selectedSlot.selectedRetailer.toLowerCase().replace(/\s+/g, '')
      const priceInfo = selectedSlot.product.prices.find((p) => {
        const normalizedPriceName = p.shop.toLowerCase().replace(/\s+/g, '')
        return normalizedPriceName === normalizedRetailer ||
          normalizedPriceName.includes(normalizedRetailer) ||
          normalizedRetailer.includes(normalizedPriceName)
      })
      if (priceInfo) {
        return priceInfo.price
      }
    }
    return selectedSlot.product.minPrice
  }

  // Get the minimum price and the retailer offering it
  const getMinPriceInfo = () => {
    if (!selectedSlot?.product) return null

    let minPrice = Infinity
    let minRetailer = ''

    for (const priceInfo of selectedSlot.product.prices) {
      if (priceInfo.price < minPrice) {
        minPrice = priceInfo.price
        minRetailer = priceInfo.shop
      }
    }

    return minPrice < Infinity ? { price: minPrice, retailer: minRetailer } : null
  }

  // Check if a shop is the selected retailer
  const isSelectedRetailer = (shopName: string) => {
    if (!selectedSlot?.selectedRetailer) return false
    const normalizedShopName = shopName.toLowerCase().replace(/\s+/g, '')
    const normalizedSelected = selectedSlot.selectedRetailer.toLowerCase().replace(/\s+/g, '')
    return normalizedShopName === normalizedSelected ||
      normalizedShopName.includes(normalizedSelected) ||
      normalizedSelected.includes(normalizedShopName)
  }

  return (
    <>
      <tr className={cn(
        "border-b border-border transition-colors hover:bg-muted/20",
        index % 2 === 0 ? "bg-background" : "bg-muted/5"
      )}>
        {/* Component Column */}
        <td className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {config.label}
            </span>
            {config.required && (
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            )}
          </div>
        </td>

        {/* Selection Column */}
        <td className="p-4">
          {selectedSlot ? (
            <div className="flex items-center gap-2">
              {/* Multiple products dropdown if more than 1 */}
              {slots.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-between gap-2 max-w-[320px] h-auto py-2"
                      suppressHydrationWarning
                    >
                      <div className="flex items-center gap-2">
                        {selectedSlot.product?.image && (
                          <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={selectedSlot.product.image}
                              alt={selectedSlot.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <span className="text-left leading-tight line-clamp-2">
                          {selectedSlot.product?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="secondary">{slots.length}</Badge>
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[320px]">
                    {slots.map((slot) => (
                      <DropdownMenuItem
                        key={slot.id}
                        onClick={() => selectSlot(slot.id)}
                        className="flex items-center gap-2 py-2"
                      >
                        {slot.product?.image && (
                          <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={slot.product.image}
                              alt={slot.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <span className="flex-1 leading-tight line-clamp-2">{slot.product?.name}</span>
                        {slot.isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                    {slots.length < config.maxSlots && (
                      <>
                        <DropdownMenuItem
                          onClick={handleOpenSelector}
                          className="text-primary"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Another
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  {/* Product Image */}
                  {selectedSlot.product?.image && (
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={selectedSlot.product.image}
                        alt={selectedSlot.product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.png"
                        }}
                      />
                    </div>
                  )}
                  {/* Product Name - full title with wrap */}
                  <span className="text-sm text-foreground leading-tight max-w-[250px] break-words overflow-wrap-anywhere line-clamp-2">
                    {selectedSlot.product?.name}
                  </span>
                  {slots.length < config.maxSlots && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 flex-shrink-0"
                      onClick={handleOpenSelector}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Quantity Control for RAM */}
              {config.allowQuantity && selectedSlot && (
                <div className="flex items-center gap-1 bg-muted rounded px-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => setSlotQuantity(selectedSlot.id, selectedSlot.quantity - 1)}
                    disabled={selectedSlot.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium w-6 text-center">
                    {selectedSlot.quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => setSlotQuantity(selectedSlot.id, selectedSlot.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Remove Button */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  removeSlot(selectedSlot.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSelector}
              className="gap-2"
            >
              <Plus className="h-3 w-3" />
              Choose A {config.label}
            </Button>
          )}
        </td>

        {/* Base Price Column - Selected retailer's price */}
        <td className="p-4 text-center">
          {selectedSlot?.product ? (
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                ৳{((getBasePrice() || 0) * selectedSlot.quantity).toLocaleString()}
              </span>
              {selectedSlot.selectedRetailer && (
                <span className="text-xs text-muted-foreground mt-0.5">
                  {selectedSlot.selectedRetailer}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </td>

        {/* Min Price Column - Lowest price with retailer name */}
        <td className="p-4 text-center">
          {selectedSlot?.product ? (
            (() => {
              const minInfo = getMinPriceInfo()
              return minInfo ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    ৳{(minInfo.price * selectedSlot.quantity).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {minInfo.retailer}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )
            })()
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </td>

        {/* Shop Price Columns */}
        <AnimatePresence mode="popLayout">
          {SHOPS.map((shop) => {
            if (!selectedRetailers.includes(shop.name)) return null
            const price = getShopPrice(shop.name)
            const isSelected = isSelectedRetailer(shop.name)
            return (
              <motion.td
                key={shop.name}
                layout
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
                className="text-center p-4 whitespace-nowrap"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-full flex justify-center"
                >
                  {price && selectedSlot ? (
                    <Button
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-auto py-1 px-2",
                        isSelected
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : price === selectedSlot.product?.minPrice
                            ? "text-green-600 dark:text-green-400 font-semibold hover:bg-green-50 dark:hover:bg-green-900/20"
                            : "text-foreground hover:bg-muted"
                      )}
                      onClick={() => setSlotRetailer(selectedSlot.id, shop.name)}
                    >
                      ৳{(price * selectedSlot.quantity).toLocaleString()}
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </motion.div>
              </motion.td>
            )
          })}
        </AnimatePresence>
      </tr>
    </>
  )
}

