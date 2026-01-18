"use client"

import { motion } from "framer-motion"
import { ComponentRow } from "./ComponentRow"
import { RefreshCw, Share2, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBuilder } from "./BuilderContext"
import { COMPONENT_CONFIGS, SHOPS } from "./constants"
import { Badge } from "@/components/ui/badge"

export function PCBuilder() {
  const { getTotalPrice, clearBuild, slots } = useBuilder()
  const totalPrice = getTotalPrice()
  const selectedSlots = slots.filter((slot) => slot.isSelected)

  // Group components by section
  const coreComponents = COMPONENT_CONFIGS.filter(c =>
    ['CPU', 'Motherboard', 'RAM', 'Storage', 'GPU', 'PSU', 'Case', 'Cooler'].includes(c.category)
  )
  const peripherals = COMPONENT_CONFIGS.filter(c =>
    ['Monitor'].includes(c.category)
  )

  return (
    <div className="container py-8 max-w-[1600px]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Your PC Build
          </h1>
          <p className="text-sm text-muted-foreground">
            Select components to build your PC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearBuild}
            disabled={selectedSlots.length === 0}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Build
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedSlots.length === 0}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            size="sm"
            disabled={selectedSlots.length === 0}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Buy Parts
          </Button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-lg overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 font-semibold text-sm text-foreground min-w-[180px]">
                  Component
                </th>
                <th className="text-left p-4 font-semibold text-sm text-foreground min-w-[280px]">
                  Selection
                </th>
                <th className="text-center p-4 font-semibold text-sm text-foreground min-w-[100px]">
                  Base
                </th>
                {SHOPS.map((shop) => (
                  <th
                    key={shop.name}
                    className="text-center p-4 font-semibold text-sm min-w-[100px]"
                  >
                    <Badge variant="outline" className="font-normal">
                      {shop.name === "Star Tech" ? "ST" :
                        shop.name === "Techland" ? "TL" :
                          shop.name === "Potaka IT" ? "PI" :
                            shop.name === "Skyland" ? "SK" : "UT"}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {shop.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coreComponents.map((config, index) => (
                <ComponentRow
                  key={config.category}
                  config={config}
                  index={index}
                />
              ))}

              {/* Total Row */}
              <tr className="border-t-2 border-border bg-muted/20">
                <td className="p-4 font-semibold text-foreground" colSpan={2}>
                  Total:
                </td>
                <td className="text-center p-4 font-bold text-lg text-primary">
                  ৳{totalPrice > 0 ? totalPrice.toLocaleString() : 'N/A'}
                </td>
                {SHOPS.map((shop) => (
                  <td key={shop.name} className="text-center p-4 text-muted-foreground">
                    N/A
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
