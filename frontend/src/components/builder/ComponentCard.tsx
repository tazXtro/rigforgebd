"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  MonitorPlay,
  Zap,
  Box,
  Fan,
  Monitor,
  Minus,
  LucideIcon,
} from "lucide-react"
import { ComponentConfig, ComponentSlot } from "./types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ProductSelector } from "./ProductSelector"

interface ComponentCardProps {
  config: ComponentConfig
  slots: ComponentSlot[]
  onAddProduct: () => void
  onRemoveSlot: (slotId: string) => void
  onSelectSlot: (slotId: string) => void
  onQuantityChange: (slotId: string, quantity: number) => void
}

const iconMap: Record<string, LucideIcon> = {
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  MonitorPlay,
  Zap,
  Box,
  Fan,
  Monitor,
}

export function ComponentCard({
  config,
  slots,
  onAddProduct,
  onRemoveSlot,
  onSelectSlot,
  onQuantityChange,
}: ComponentCardProps) {
  const [showProductSelector, setShowProductSelector] = useState(false)
  const Icon = iconMap[config.icon] || Cpu
  const canAddMore = slots.length < config.maxSlots

  const handleAddClick = () => {
    setShowProductSelector(true)
  }

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{config.label}</h3>
                  {config.required && (
                    <Badge variant="secondary" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {slots.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-border/50 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="p-3 rounded-full bg-muted mb-3">
                <Icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                No {config.label.toLowerCase()} selected
              </p>
              <Button
                onClick={handleAddClick}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Choose {config.label}
              </Button>
            </motion.div>
          )}

          {/* Selected Products */}
          <AnimatePresence mode="popLayout">
            {slots.map((slot, index) => (
              <motion.div
                key={slot.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "mb-3 last:mb-0",
                  slots.length > 0 && index === 0 && "mt-0"
                )}
              >
                <div
                  className={cn(
                    "p-3 sm:p-4 rounded-lg border-2 transition-all cursor-pointer",
                    slot.isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 bg-background hover:border-primary/50"
                  )}
                  onClick={() => onSelectSlot(slot.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Product Image */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {slot.product?.image ? (
                        <img
                          src={slot.product.image}
                          alt={slot.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {slot.isSelected && (
                        <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base text-foreground truncate">
                        {slot.product?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {slot.product?.brand}
                      </p>

                      {/* Price */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">
                          ৳{slot.product?.minPrice.toLocaleString()}
                        </span>
                        {slot.product && slot.product.basePrice > slot.product.minPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            ৳{slot.product.basePrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls - Only for RAM */}
                      {config.allowQuantity && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Quantity:</span>
                          <div className="flex items-center gap-1 bg-muted rounded-md">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                onQuantityChange(slot.id, slot.quantity - 1)
                              }}
                              disabled={slot.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">
                              {slot.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                onQuantityChange(slot.id, slot.quantity + 1)
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveSlot(slot.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add More Button */}
          {slots.length > 0 && canAddMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3"
            >
              <Button
                onClick={handleAddClick}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
              >
                <Plus className="h-4 w-4" />
                Add Another {config.label}
              </Button>
            </motion.div>
          )}

          {/* Max Slots Warning */}
          {!canAddMore && slots.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <AlertCircle className="h-3 w-3" />
              <span>Maximum {config.maxSlots} {config.label.toLowerCase()}(s) allowed</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Selector Modal */}
      <ProductSelector
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        category={config.category}
        onSelect={(product) => {
          onAddProduct()
          setShowProductSelector(false)
        }}
      />
    </>
  )
}
