"use client"

import { motion } from "framer-motion"
import { Download, Save, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useBuilder } from "./BuilderContext"
import { COMPONENT_CONFIGS } from "./constants"
import { generateBuildPDF } from "./generateBuildPDF"

export function BuildSummary() {
  const { slots, getTotalPrice, getBaseTotal, getMinPriceTotal, clearBuild } = useBuilder()

  const totalPrice = getTotalPrice()
  const baseTotal = getBaseTotal()
  const minPriceTotal = getMinPriceTotal()
  const selectedSlots = slots.filter((slot) => slot.isSelected)
  const totalComponents = selectedSlots.length

  // Count required components
  const requiredConfigs = COMPONENT_CONFIGS.filter((c) => c.required)
  const selectedRequiredCount = requiredConfigs.filter((config) =>
    selectedSlots.some((slot) => slot.category === config.category)
  ).length

  const isComplete = selectedRequiredCount === requiredConfigs.length

  return (
    <Card className="sticky top-20 border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Build Summary</span>
          {isComplete && (
            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
              Complete
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Components:</span>
            <span className="font-medium">{totalComponents}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Required Complete:</span>
            <span className="font-medium">
              {selectedRequiredCount} / {requiredConfigs.length}
            </span>
          </div>
        </div>

        <Separator />

        {/* Selected Components */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Items:</h4>
          {selectedSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No components selected
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {selectedSlots.map((slot) => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {slot.product?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {slot.category}
                      </Badge>
                      {slot.quantity > 1 && (
                        <span className="text-xs text-muted-foreground">
                          x{slot.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                    ৳{((slot.product?.minPrice || 0) * slot.quantity).toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Total Price */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Estimated Total:</span>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                ৳{totalPrice.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                +VAT & Delivery charges may apply
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full gap-2" 
            disabled={totalComponents === 0}
            onClick={() => generateBuildPDF({ slots, baseTotal, minPriceTotal })}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2" disabled={totalComponents === 0}>
            <Save className="h-4 w-4" />
            Save Build
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={clearBuild}
            disabled={totalComponents === 0}
          >
            <Trash2 className="h-4 w-4" />
            Clear Build
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
