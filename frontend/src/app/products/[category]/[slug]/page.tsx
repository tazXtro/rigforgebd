import { Suspense } from "react"
import { notFound } from "next/navigation"
import { ProductDetailClient } from "@/components/products/ProductDetailClient"
import { fetchProductDetailServer } from "@/lib/productsApi.server"

// Enable ISR - revalidate every 30 seconds
export const revalidate = 30

interface ProductDetailPageProps {
    params: Promise<{ category: string; slug: string }>
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
    const { category, slug } = await params
    const product = await fetchProductDetailServer(category, slug)
    
    if (!product) {
        return { title: "Product Not Found | RigForgeBD" }
    }
    
    const retailerCount = product.retailers?.length || 0
    const lowestPrice = retailerCount > 0 
        ? Math.min(...product.retailers.map((r: { price: number }) => r.price))
        : 0
    
    return {
        title: `${product.name} | RigForgeBD`,
        description: `Compare prices for ${product.name} from ${retailerCount} retailers in Bangladesh. Best price: ৳${lowestPrice.toLocaleString()}.`,
        openGraph: {
            title: product.name,
            description: `Compare prices from ${retailerCount} retailers`,
            images: product.image ? [product.image] : [],
        },
    }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
    const { category, slug } = await params
    const product = await fetchProductDetailServer(category, slug)
    
    if (!product) {
        notFound()
    }
    
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        }>
            <ProductDetailClient product={product} />
        </Suspense>
    )
}
