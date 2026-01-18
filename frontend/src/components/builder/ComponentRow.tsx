"use client"

import { useState } from "react"
import { Plus, ChevronDown, Trash2, Check, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ComponentConfig } from "./types"
import { useBuilder } from "./BuilderContext"
import { SHOPS } from "./constants"
import { ProductSelector } from "./ProductSelector"
import { cn } from "@/lib/utils"
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
  const { getSlotsForCategory, removeSlot, selectSlot, setSlotQuantity } = useBuilder()
  const [showProductSelector, setShowProductSelector] = useState(false)
  const slots = getSlotsForCategory(config.category)
  const selectedSlot = slots.find((s) => s.isSelected)

  const handleOpenSelector = () => {
    setShowProductSelector(true)
  }

  // Calculate shop prices for selected product
  const getShopPrice = (shopName: string) => {
    if (!selectedSlot?.product) return null
    const priceInfo = selectedSlot.product.prices.find((p) => p.shop === shopName)
    return priceInfo?.price
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
                      className="flex-1 justify-between gap-2 max-w-[280px]"
                    >
                      <span className="truncate text-left flex-1">
                        {selectedSlot.product?.name}
                      </span>
                      <Badge variant="secondary" className="ml-2">{slots.length}</Badge>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[280px]">
                    {slots.map((slot) => (
                      <DropdownMenuItem
                        key={slot.id}
                        onClick={() => selectSlot(slot.id)}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate flex-1">{slot.product?.name}</span>
                        {slot.isSelected && <Check className="h-4 w-4 text-primary" />}
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
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-foreground truncate max-w-[200px]">
                    {selectedSlot.product?.name}
                  </span>
                  {slots.length < config.maxSlots && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
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

        {/* Base Price Column */}
        <td className="p-4 text-center">
          {selectedSlot?.product ? (
            <span className="text-sm font-semibold text-foreground">
              ৳{(selectedSlot.product.basePrice * selectedSlot.quantity).toLocaleString()}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </td>

        {/* Shop Price Columns */}
        {SHOPS.map((shop) => {
          const price = getShopPrice(shop.name)
          return (
            <td key={shop.name} className="p-4 text-center">
              {price && selectedSlot ? (
                <span className={cn(
                  "text-sm font-medium",
                  price === selectedSlot.product?.minPrice
                    ? "text-green-600 dark:text-green-400 font-semibold"
                    : "text-foreground"
                )}>
                  ৳{(price * selectedSlot.quantity).toLocaleString()}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">N/A</span>
              )}
            </td>
          )
        })}
      </tr>

      <ProductSelector
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        category={config.category}
        onSelect={() => setShowProductSelector(false)}
      />
    </>
  )
}
