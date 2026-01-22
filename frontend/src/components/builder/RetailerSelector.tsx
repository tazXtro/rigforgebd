"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, Store, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBuilder } from "./BuilderContext"
import { SHOPS } from "./constants"
import { cn } from "@/lib/utils"

export function RetailerSelector() {
    const { selectedRetailers, toggleRetailer, selectAllRetailers, clearRetailers } = useBuilder()

    const allShopNames = SHOPS.map(s => s.name)
    const areAllSelected = allShopNames.every(name => selectedRetailers.includes(name))

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <Store className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">Compare Retailers</h3>
                            <p className="text-xs text-muted-foreground">Select stores to compare prices</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => areAllSelected ? clearRetailers() : selectAllRetailers(allShopNames)}
                            className="text-xs h-7"
                        >
                            {areAllSelected ? (
                                <>
                                    <X className="h-3 w-3 mr-1" />
                                    Clear All
                                </>
                            ) : (
                                <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Select All
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {SHOPS.map((shop) => {
                        const isSelected = selectedRetailers.includes(shop.name)
                        return (
                            <motion.button
                                key={shop.name}
                                onClick={() => toggleRetailer(shop.name)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:bg-muted"
                                )}
                            >
                                <AnimatePresence mode="popLayout">
                                    {isSelected && (
                                        <motion.span
                                            key="check"
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: "auto", opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <Check className="h-3 w-3" />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                {shop.name}
                            </motion.button>
                        )
                    })}
                </div>
            </div>
        </motion.div>
    )
}
