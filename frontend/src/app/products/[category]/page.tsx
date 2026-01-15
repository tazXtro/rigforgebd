import { Suspense } from "react"
import { ProductsPageClient } from "@/components/products/ProductsPageClient"
import ProductsLoading from "../loading"

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

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ category: string }>
}) {
    const { category } = await params

    return (
        <Suspense fallback={<ProductsLoading />}>
            <ProductsPageClient initialCategory={category} />
        </Suspense>
    )
}
