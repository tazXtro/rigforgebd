"use client"

import {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
} from "react"
import { ComponentCategory, ComponentSlot, Product } from "./types"

interface BuilderContextType {
    slots: ComponentSlot[]
    getSlotsForCategory: (category: ComponentCategory) => ComponentSlot[]
    addProductToSlot: (category: ComponentCategory, product: Product) => void
    removeSlot: (slotId: string) => void
    selectSlot: (slotId: string) => void
    setSlotQuantity: (slotId: string, quantity: number) => void
    setSlotRetailer: (slotId: string, retailer: string) => void
    getTotalPrice: () => number
    getMinPriceTotal: () => number
    getBaseTotal: () => number
    getShopTotal: (shopName: string) => number
    clearBuild: () => void
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined)

export function BuilderProvider({ children }: { children: ReactNode }) {
    const [slots, setSlots] = useState<ComponentSlot[]>([])

    const getSlotsForCategory = useCallback(
        (category: ComponentCategory) => {
            return slots.filter((slot) => slot.category === category)
        },
        [slots]
    )

    const addProductToSlot = useCallback(
        (category: ComponentCategory, product: Product) => {
            const newSlot: ComponentSlot = {
                id: `${category}-${Date.now()}`,
                category,
                product,
                quantity: 1,
                isSelected: true,
            }

            setSlots((prev) => {
                // Deselect all other slots in the same category
                const updated = prev.map((slot) =>
                    slot.category === category ? { ...slot, isSelected: false } : slot
                )
                return [...updated, newSlot]
            })
        },
        []
    )

    const removeSlot = useCallback((slotId: string) => {
        setSlots((prev) => {
            const filtered = prev.filter((slot) => slot.id !== slotId)

            // If we removed the selected slot in a category, select another one
            const removedSlot = prev.find((slot) => slot.id === slotId)
            if (removedSlot?.isSelected) {
                const sameCategory = filtered.filter(
                    (slot) => slot.category === removedSlot.category
                )
                if (sameCategory.length > 0) {
                    return filtered.map((slot) =>
                        slot.id === sameCategory[0].id
                            ? { ...slot, isSelected: true }
                            : slot
                    )
                }
            }

            return filtered
        })
    }, [])

    const selectSlot = useCallback((slotId: string) => {
        setSlots((prev) => {
            const targetSlot = prev.find((slot) => slot.id === slotId)
            if (!targetSlot) return prev

            return prev.map((slot) => ({
                ...slot,
                isSelected:
                    slot.category === targetSlot.category
                        ? slot.id === slotId
                        : slot.isSelected,
            }))
        })
    }, [])

    const setSlotQuantity = useCallback((slotId: string, quantity: number) => {
        if (quantity < 1) return

        setSlots((prev) =>
            prev.map((slot) =>
                slot.id === slotId ? { ...slot, quantity } : slot
            )
        )
    }, [])

    const setSlotRetailer = useCallback((slotId: string, retailer: string) => {
        setSlots((prev) =>
            prev.map((slot) =>
                slot.id === slotId ? { ...slot, selectedRetailer: retailer } : slot
            )
        )
    }, [])

    const getTotalPrice = useCallback(() => {
        return slots.reduce((total, slot) => {
            if (slot.isSelected && slot.product) {
                return total + slot.product.minPrice * slot.quantity
            }
            return total
        }, 0)
    }, [slots])

    const getMinPriceTotal = useCallback(() => {
        return slots.reduce((total, slot) => {
            if (slot.isSelected && slot.product) {
                return total + slot.product.minPrice * slot.quantity
            }
            return total
        }, 0)
    }, [slots])

    const getBaseTotal = useCallback(() => {
        return slots.reduce((total, slot) => {
            if (slot.isSelected && slot.product) {
                // If retailer selected, use that price; otherwise use minPrice
                if (slot.selectedRetailer) {
                    const normalizedRetailer = slot.selectedRetailer.toLowerCase().replace(/\s+/g, '')
                    const priceInfo = slot.product.prices.find((p) => {
                        const normalizedPriceName = p.shop.toLowerCase().replace(/\s+/g, '')
                        return normalizedPriceName === normalizedRetailer ||
                               normalizedPriceName.includes(normalizedRetailer) ||
                               normalizedRetailer.includes(normalizedPriceName)
                    })
                    if (priceInfo) {
                        return total + priceInfo.price * slot.quantity
                    }
                }
                return total + slot.product.minPrice * slot.quantity
            }
            return total
        }, 0)
    }, [slots])

    const getShopTotal = useCallback((shopName: string) => {
        // Normalize shop name for comparison (lowercase, remove spaces)
        const normalizedShopName = shopName.toLowerCase().replace(/\s+/g, '')
        
        return slots.reduce((total, slot) => {
            if (slot.isSelected && slot.product) {
                const priceInfo = slot.product.prices.find((p) => {
                    const normalizedPriceName = p.shop.toLowerCase().replace(/\s+/g, '')
                    return normalizedPriceName === normalizedShopName || 
                           normalizedPriceName.includes(normalizedShopName) ||
                           normalizedShopName.includes(normalizedPriceName)
                })
                if (priceInfo) {
                    return total + priceInfo.price * slot.quantity
                }
            }
            return total
        }, 0)
    }, [slots])

    const clearBuild = useCallback(() => {
        setSlots([])
    }, [])

    return (
        <BuilderContext.Provider
            value={{
                slots,
                getSlotsForCategory,
                addProductToSlot,
                removeSlot,
                selectSlot,
                setSlotQuantity,
                setSlotRetailer,
                getTotalPrice,
                getMinPriceTotal,
                getBaseTotal,
                getShopTotal,
                clearBuild,
            }}
        >
            {children}
        </BuilderContext.Provider>
    )
}

export function useBuilder() {
    const context = useContext(BuilderContext)
    if (context === undefined) {
        throw new Error("useBuilder must be used within a BuilderProvider")
    }
    return context
}
