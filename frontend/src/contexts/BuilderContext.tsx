"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { ComponentSlot, Product, ComponentCategory } from "@/types/builder"

interface BuilderContextType {
  slots: ComponentSlot[]
  addProductToSlot: (category: ComponentCategory, product: Product) => void
  removeSlot: (slotId: string) => void
  setSlotQuantity: (slotId: string, quantity: number) => void
  selectSlot: (slotId: string) => void
  getTotalPrice: () => number
  clearBuild: () => void
  getSlotsForCategory: (category: ComponentCategory) => ComponentSlot[]
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined)

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<ComponentSlot[]>([])

  const addProductToSlot = useCallback((category: ComponentCategory, product: Product) => {
    setSlots((prevSlots) => {
      const categorySlots = prevSlots.filter((s) => s.category === category)
      
      // Check if max slots reached (3 for most, 1 for some)
      const maxSlots = category === "Motherboard" || category === "Case" || category === "PSU" ? 1 : 3
      if (categorySlots.length >= maxSlots) {
        return prevSlots
      }

      const newSlot: ComponentSlot = {
        id: `${category}-${Date.now()}-${Math.random()}`,
        category,
        product,
        quantity: 1,
        isSelected: categorySlots.length === 0, // Auto-select if first slot
      }

      // Deselect other slots in the same category
      const updatedSlots = prevSlots.map((slot) =>
        slot.category === category ? { ...slot, isSelected: false } : slot
      )

      return [...updatedSlots, newSlot]
    })
  }, [])

  const removeSlot = useCallback((slotId: string) => {
    setSlots((prevSlots) => {
      const slotToRemove = prevSlots.find((s) => s.id === slotId)
      const remainingSlots = prevSlots.filter((s) => s.id !== slotId)

      // If removed slot was selected, select the first remaining slot in category
      if (slotToRemove?.isSelected && slotToRemove.category) {
        const categorySlots = remainingSlots.filter((s) => s.category === slotToRemove.category)
        if (categorySlots.length > 0) {
          return remainingSlots.map((slot) =>
            slot.id === categorySlots[0].id ? { ...slot, isSelected: true } : slot
          )
        }
      }

      return remainingSlots
    })
  }, [])

  const setSlotQuantity = useCallback((slotId: string, quantity: number) => {
    setSlots((prevSlots) =>
      prevSlots.map((slot) =>
        slot.id === slotId ? { ...slot, quantity: Math.max(1, quantity) } : slot
      )
    )
  }, [])

  const selectSlot = useCallback((slotId: string) => {
    setSlots((prevSlots) => {
      const selectedSlot = prevSlots.find((s) => s.id === slotId)
      if (!selectedSlot) return prevSlots

      return prevSlots.map((slot) =>
        slot.category === selectedSlot.category
          ? { ...slot, isSelected: slot.id === slotId }
          : slot
      )
    })
  }, [])

  const getTotalPrice = useCallback(() => {
    return slots.reduce((total, slot) => {
      if (slot.isSelected && slot.product) {
        return total + slot.product.minPrice * slot.quantity
      }
      return total
    }, 0)
  }, [slots])

  const clearBuild = useCallback(() => {
    setSlots([])
  }, [])

  const getSlotsForCategory = useCallback(
    (category: ComponentCategory) => {
      return slots.filter((slot) => slot.category === category)
    },
    [slots]
  )

  return (
    <BuilderContext.Provider
      value={{
        slots,
        addProductToSlot,
        removeSlot,
        setSlotQuantity,
        selectSlot,
        getTotalPrice,
        clearBuild,
        getSlotsForCategory,
      }}
    >
      {children}
    </BuilderContext.Provider>
  )
}

export function useBuilder() {
  const context = useContext(BuilderContext)
  if (!context) {
    throw new Error("useBuilder must be used within BuilderProvider")
  }
  return context
}
