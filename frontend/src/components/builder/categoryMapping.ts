import { ComponentCategory } from "./types"

/**
 * Mapping between builder category names and product page URL slugs
 * Builder uses short names (CPU, GPU), products use URL-friendly slugs (processors, graphics-cards)
 */
export const BUILDER_TO_PRODUCT_CATEGORY: Record<ComponentCategory, string> = {
    CPU: "processors",
    Motherboard: "motherboards",
    RAM: "memory",
    Storage: "storage",
    GPU: "graphics-cards",
    PSU: "power-supply",
    Case: "cases",
    Cooler: "cooling",
    Monitor: "monitors",
}

/**
 * Reverse mapping from product slugs to builder categories
 */
export const PRODUCT_TO_BUILDER_CATEGORY: Record<string, ComponentCategory> = {
    processors: "CPU",
    motherboards: "Motherboard",
    memory: "RAM",
    storage: "Storage",
    "graphics-cards": "GPU",
    "power-supply": "PSU",
    cases: "Case",
    cooling: "Cooler",
    monitors: "Monitor",
}

/**
 * Get product category slug from builder category
 */
export function getProductCategorySlug(builderCategory: ComponentCategory): string {
    return BUILDER_TO_PRODUCT_CATEGORY[builderCategory] || builderCategory.toLowerCase()
}

/**
 * Get builder category from product slug
 */
export function getBuilderCategory(productSlug: string): ComponentCategory | null {
    return PRODUCT_TO_BUILDER_CATEGORY[productSlug] || null
}
