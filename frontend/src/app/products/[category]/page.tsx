import { Suspense } from "react"
import { ProductsPageClient } from "@/components/products/ProductsPageClient"
import ProductsLoading from "../loading"
import {
    fetchProductsServer,
    fetchCategoryCountsServer,
    fetchRetailersServer,
} from "@/lib/productsApi.server"

// Enable ISR - revalidate every 30 seconds
export const revalidate = 30

// Generate metadata for category pages
export async function generateMetadata({
    params,
}: {
    params: Promise<{ category: string }>
}) {
    const { category } = await params

    const categoryNames: Record<string, string> = {
        processors: "Processors",
        "graphics-cards": "Graphics Cards",
        motherboards: "Motherboards",
        memory: "Memory (RAM)",
        storage: "Storage",
        "power-supply": "Power Supplies",
        cases: "PC Cases",
        cooling: "Cooling",
        monitors: "Monitors",
        accessories: "Accessories",
        laptops: "Laptops",
        "pre-builts": "Pre-built PCs",
    }

    const categoryName = categoryNames[category] || "Products"

    return {
        title: `${categoryName} | RigForgeBD`,
        description: `Compare prices on ${categoryName.toLowerCase()} from top Bangladeshi retailers. Find the best deals on ${categoryName.toLowerCase()} at RigForgeBD.`,
    }
}

// Generate static params for common categories
export function generateStaticParams() {
    return [
        { category: "processors" },
        { category: "graphics-cards" },
        { category: "motherboards" },
        { category: "memory" },
        { category: "storage" },
        { category: "power-supply" },
        { category: "cases" },
        { category: "cooling" },
        { category: "monitors" },
        { category: "accessories" },
        { category: "laptops" },
        { category: "pre-builts" },
    ]
}

interface CategoryPageProps {
    params: Promise<{ category: string }>
    searchParams: Promise<{
        page?: string
        sort?: string
        q?: string
        cpu_id?: string
        motherboard_id?: string
        compat_mode?: "strict" | "lenient"
    }>
}

export default async function CategoryPage({
    params,
    searchParams,
}: CategoryPageProps) {
    const { category } = await params
    const search = await searchParams
    const page = parseInt(search.page || "1", 10)
    const sort = search.sort || "newest"
    const query = search.q || ""
    const cpuId = search.cpu_id
    const motherboardId = search.motherboard_id
    const compatMode = (search.compat_mode as "strict" | "lenient" | undefined) || undefined

    const compatibilityParams =
        category === "motherboards" && cpuId
            ? { cpu_id: cpuId, compat_mode: compatMode }
            : category === "memory" && motherboardId
                ? { motherboard_id: motherboardId, compat_mode: compatMode }
                : {}

    // Fetch initial data on the server with Next.js caching
    const [productsData, categoryCounts, retailers] = await Promise.all([
        fetchProductsServer({
            category,
            page,
            page_size: 24,
            sort,
            search: query || undefined,
            ...compatibilityParams,
        }),
        fetchCategoryCountsServer(),
        fetchRetailersServer(),
    ])

    return (
        <Suspense fallback={<ProductsLoading />}>
            <ProductsPageClient
                initialCategory={category}
                initialProducts={productsData.products}
                initialPagination={productsData.pagination}
                initialCategoryCounts={categoryCounts}
                initialRetailers={retailers}
            />
        </Suspense>
    )
}
