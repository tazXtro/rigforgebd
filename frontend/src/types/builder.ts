export type ShopName = "Techland" | "Star Tech" | "Ryans" | "Potaka IT" | "Skyland"

export interface Shop {
  name: ShopName
  logo?: string
}

export interface ProductPrice {
  shop: ShopName
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
  prices: ProductPrice[]
  minPrice: number
  basePrice: number
}

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

export interface ComponentSlot {
  id: string
  category: ComponentCategory
  product: Product | null
  quantity: number
  isSelected: boolean
}

export interface ComponentConfig {
  category: ComponentCategory
  label: string
  icon: string
  required: boolean
  maxSlots: number
  allowQuantity: boolean
  description: string
}

export interface BuildState {
  slots: ComponentSlot[]
  totalPrice: number
  name?: string
}
