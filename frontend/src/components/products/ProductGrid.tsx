"use client";

import { motion } from "framer-motion";
import { Loader2, Package } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  showSpecs?: boolean;
}

export function ProductGrid({
  products,
  isLoading,
  showSpecs = true,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="p-4 rounded-full bg-muted mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No products found
        </h3>
        <p className="text-muted-foreground max-w-md">
          Try adjusting your filters or search terms to find what you're looking
          for.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <ProductCard product={product} showSpecs={showSpecs} />
        </motion.div>
      ))}
    </div>
  );
}
