"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ComponentRow } from "./ComponentRow"
import { RetailerSelector } from "./RetailerSelector"
import { RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBuilder } from "./BuilderContext"
import { COMPONENT_CONFIGS, SHOPS } from "./constants"
import { Badge } from "@/components/ui/badge"
import { generateBuildPDF } from "./generateBuildPDF"

export function PCBuilder() {
  const { getTotalPrice, clearBuild, slots, getMinPriceTotal, getBaseTotal, getShopTotal, selectedRetailers } = useBuilder()
  const totalPrice = getTotalPrice()
  const minPriceTotal = getMinPriceTotal()
  const baseTotal = getBaseTotal()
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
            size="sm"
            disabled={selectedSlots.length === 0}
            className="gap-2"
            onClick={() => generateBuildPDF({ slots, baseTotal, minPriceTotal })}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </motion.div>

      <RetailerSelector />

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
                <th className="text-center p-4 font-semibold text-sm text-foreground min-w-[120px]">
                  <Badge variant="secondary" className="font-normal bg-blue-500/10 text-blue-600">
                    Base
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    Selected
                  </div>
                </th>
                <th className="text-center p-4 font-semibold text-sm text-foreground min-w-[120px]">
                  <Badge variant="secondary" className="font-normal bg-green-500/10 text-green-600">
                    Minimum
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    Lowest
                  </div>
                </th>
                <AnimatePresence mode="popLayout">
                  {SHOPS.map((shop) => {
                    if (!selectedRetailers.includes(shop.name)) return null
                    return (
                      <motion.th
                        key={shop.name}
                        layout
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{ transformOrigin: "left" }}
                        className="text-center p-4 font-semibold text-sm min-w-[100px] whitespace-nowrap"
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex flex-col items-center justify-center w-full"
                        >
                          <Badge variant="outline" className="font-normal">
                            {shop.name === "Startech" ? "ST" :
                              shop.name === "Techland" ? "TL" :
                                shop.name === "Potaka IT" ? "PI" :
                                  shop.name === "Skyland" ? "SK" : "UT"}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {shop.name}
                          </div>
                        </motion.div>
                      </motion.th>
                    )
                  })}
                </AnimatePresence>
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
                <td className="text-center p-4 font-bold text-lg text-blue-600 dark:text-blue-400">
                  ৳{baseTotal > 0 ? baseTotal.toLocaleString() : 'N/A'}
                </td>
                <td className="text-center p-4 font-bold text-lg text-green-600 dark:text-green-400">
                  ৳{minPriceTotal > 0 ? minPriceTotal.toLocaleString() : 'N/A'}
                </td>
                <AnimatePresence mode="popLayout">
                  {SHOPS.map((shop) => {
                    if (!selectedRetailers.includes(shop.name)) return null
                    const shopTotal = getShopTotal(shop.name)
                    return (
                      <motion.td
                        key={shop.name}
                        layout
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{ transformOrigin: "left" }}
                        className="text-center p-4 text-foreground font-medium whitespace-nowrap"
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {shopTotal > 0 ? `৳${shopTotal.toLocaleString()}` : 'N/A'}
                        </motion.div>
                      </motion.td>
                    )
                  })}
                </AnimatePresence>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
