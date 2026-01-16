import { Suspense } from "react"
import { ProductsPageClient } from "@/components/products/ProductsPageClient"
import ProductsLoading from "./loading"
import {
    fetchProductsServer,
    fetchCategoryCountsServer,
    fetchRetailersServer,
} from "@/lib/productsApi.server"

export const metadata = {
    title: "Browse Products | RigForgeBD",
    description: "Browse PC components from top Bangladeshi retailers. Compare prices on processors, graphics cards, motherboards, memory, storage, and more.",
}

// Enable ISR - revalidate every 30 seconds
export const revalidate = 30

interface ProductsPageProps {
    searchParams: Promise<{
        page?: string
        sort?: string
        q?: string
    }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
    const params = await searchParams
    const page = parseInt(params.page || "1", 10)
    const sort = params.sort || "newest"
    const search = params.q || ""

    // Fetch initial data on the server with Next.js caching
    // These requests are automatically deduplicated and cached
    const [productsData, categoryCounts, retailers] = await Promise.all([
        fetchProductsServer({
            page,
            page_size: 24,
            sort,
            search: search || undefined,
        }),
        fetchCategoryCountsServer(),
        fetchRetailersServer(),
    ])

    return (
        <Suspense fallback={<ProductsLoading />}>
            <ProductsPageClient
                initialProducts={productsData.products}
                initialPagination={productsData.pagination}
                initialCategoryCounts={categoryCounts}
                initialRetailers={retailers}
            />
        </Suspense>
    )
}
