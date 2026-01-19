// Types for the PC Builder feature

export type ComponentCategory =
    | "CPU"
    | "Motherboard"
    | "RAM"
    | "Storage"
    | "GPU"
    | "PSU"
    | "Case"
    | "Cooler"
    | "Monitor"

export interface ComponentConfig {
    category: ComponentCategory
    label: string
    description: string
    icon: string
    required: boolean
    maxSlots: number
    allowQuantity?: boolean
}

export interface ShopPrice {
    shop: string
    price: number
    availability: "in-stock" | "out-of-stock" | "pre-order"
    url?: string
}

export interface Product {
    id: string
    name: string
    brand: string
    image: string
    category: ComponentCategory
    specifications: Record<string, string>
    minPrice: number
    basePrice: number
    prices: ShopPrice[]
}

export interface ComponentSlot {
    id: string
    category: ComponentCategory
    product: Product | null
    quantity: number
    isSelected: boolean
    selectedRetailer?: string  // The retailer user selected to buy from
}

export interface Shop {
    name: string
    logo?: string
    url?: string
}
