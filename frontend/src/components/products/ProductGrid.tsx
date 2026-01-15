"use client"

import { motion } from "framer-motion"
import { ProductCard, Product } from "./ProductCard"

interface ProductGridProps {
    products: Product[]
    viewMode?: "grid" | "list"
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
}

export function ProductGrid({ products, viewMode = "grid" }: ProductGridProps) {
    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                    Try adjusting your search or filter criteria to find what you're looking for.
                </p>
            </div>
        )
    }

    if (viewMode === "list") {
        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-4"
            >
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode="list" />
                ))}
            </motion.div>
        )
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {products.map((product) => (
                <ProductCard key={product.id} product={product} viewMode="grid" />
            ))}
        </motion.div>
    )
}
