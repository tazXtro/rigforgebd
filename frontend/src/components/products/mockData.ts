import { Product } from "./ProductCard"

// Helper to filter products
export function filterProducts(
    products: Product[],
    filters: {
        search?: string
        category?: string
        brands?: string[]
        retailers?: string[]
        minPrice?: number
        maxPrice?: number
        inStock?: boolean
    }
): Product[] {
    return products.filter((product) => {
        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            const matchesSearch =
                product.name.toLowerCase().includes(searchLower) ||
                product.brand.toLowerCase().includes(searchLower) ||
                product.category.toLowerCase().includes(searchLower)
            if (!matchesSearch) return false
        }

        // Category filter
        if (filters.category && product.categorySlug !== filters.category) {
            return false
        }

        // Brand filter
        if (filters.brands && filters.brands.length > 0) {
            const brandLower = product.brand.toLowerCase().replace(/\s+/g, "-")
            if (!filters.brands.some((b) => brandLower.includes(b))) {
                return false
            }
        }

        // Retailer filter
        if (filters.retailers && filters.retailers.length > 0) {
            const productRetailers = product.retailers.map((r) =>
                r.name.toLowerCase().replace(/\s+/g, "")
            )
            if (!filters.retailers.some((r) => productRetailers.some((pr) => pr.includes(r)))) {
                return false
            }
        }

        // Price filter - only apply if user has set custom price bounds
        // Default maxPrice of 500000 should not filter out expensive products
        if (product.retailers.length > 0) {
            const lowestPrice = Math.min(...product.retailers.map((r) => r.price))
            if (filters.minPrice && filters.minPrice > 0 && lowestPrice < filters.minPrice) {
                return false
            }
            // Only filter by maxPrice if it's not the default value (1000000)
            if (filters.maxPrice && filters.maxPrice < 1000000 && lowestPrice > filters.maxPrice) {
                return false
            }
        }

        // Stock filter
        if (filters.inStock) {
            const hasStock = product.retailers.some((r) => r.inStock)
            if (!hasStock) return false
        }

        return true
    })
}

// Helper to sort products
export function sortProducts(
    products: Product[],
    sortBy: string
): Product[] {
    const sorted = [...products]

    switch (sortBy) {
        case "price_asc":
            sorted.sort((a, b) => {
                const priceA = a.retailers.length > 0 ? Math.min(...a.retailers.map((r) => r.price)) : Infinity
                const priceB = b.retailers.length > 0 ? Math.min(...b.retailers.map((r) => r.price)) : Infinity
                return priceA - priceB
            })
            break
        case "price_desc":
            sorted.sort((a, b) => {
                const priceA = a.retailers.length > 0 ? Math.min(...a.retailers.map((r) => r.price)) : 0
                const priceB = b.retailers.length > 0 ? Math.min(...b.retailers.map((r) => r.price)) : 0
                return priceB - priceA
            })
            break
        case "name_asc":
            sorted.sort((a, b) => a.name.localeCompare(b.name))
            break
        case "name_desc":
            sorted.sort((a, b) => b.name.localeCompare(a.name))
            break
        default:
            // Default: keep original order (newest)
            break
    }

    return sorted
}
