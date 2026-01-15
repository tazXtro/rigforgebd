import { Suspense } from "react"
import { ProductsPageClient } from "@/components/products/ProductsPageClient"
import ProductsLoading from "./loading"

export const metadata = {
    title: "Browse Products | RigForgeBD",
    description: "Browse PC components from top Bangladeshi retailers. Compare prices on processors, graphics cards, motherboards, memory, storage, and more.",
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<ProductsLoading />}>
            <ProductsPageClient />
        </Suspense>
    )
}
