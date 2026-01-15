"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Store,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Cpu,
  MemoryStick,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Product, ProductPrice } from "@/types/product";

interface ProductCardProps {
  product: Product;
  showSpecs?: boolean;
}

export function ProductCard({ product, showSpecs = true }: ProductCardProps) {
  const [showAllPrices, setShowAllPrices] = useState(false);

  const lowestPrice = product.prices.reduce(
    (min, p) => (parseFloat(p.price) < parseFloat(min.price) ? p : min),
    product.prices[0]
  );

  const inStockPrices = product.prices.filter((p) => p.is_available);
  const displayPrices = showAllPrices
    ? product.prices
    : product.prices.slice(0, 2);

  const getAvailabilityBadge = (availability: ProductPrice["availability"]) => {
    switch (availability) {
      case "in_stock":
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            <Check className="h-3 w-3 mr-1" />
            In Stock
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            Out of Stock
          </Badge>
        );
      case "pre_order":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            Pre-order
          </Badge>
        );
      case "upcoming":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
            Upcoming
          </Badge>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          {/* Product Image */}
          <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Cpu className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            {/* Brand badge */}
            {product.brand && (
              <Badge
                variant="secondary"
                className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm"
              >
                {product.brand}
              </Badge>
            )}
            {/* Discount badge */}
            {lowestPrice?.original_price &&
              parseFloat(lowestPrice.original_price) >
                parseFloat(lowestPrice.price) && (
                <Badge className="absolute top-3 right-3 bg-red-500 text-white">
                  {Math.round(
                    ((parseFloat(lowestPrice.original_price) -
                      parseFloat(lowestPrice.price)) /
                      parseFloat(lowestPrice.original_price)) *
                      100
                  )}
                  % OFF
                </Badge>
              )}
          </div>

          {/* Product Info */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <h3 className="font-semibold text-foreground line-clamp-2 min-h-[3rem] group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            {/* GPU Specs (if available) */}
            {showSpecs && product.gpu_specs && (
              <div className="flex flex-wrap gap-2">
                {product.gpu_specs.memory_size && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/5 border-primary/20"
                  >
                    <MemoryStick className="h-3 w-3 mr-1" />
                    {product.gpu_specs.memory_size}
                  </Badge>
                )}
                {product.gpu_specs.chipset && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-secondary/50"
                  >
                    {product.gpu_specs.chipset}
                  </Badge>
                )}
                {product.gpu_specs.tdp && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {product.gpu_specs.tdp}
                  </Badge>
                )}
              </div>
            )}

            {/* Price Section */}
            <div className="space-y-2">
              {/* Lowest Price */}
              {lowestPrice && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    ৳{parseInt(lowestPrice.price).toLocaleString()}
                  </span>
                  {lowestPrice.original_price &&
                    parseFloat(lowestPrice.original_price) >
                      parseFloat(lowestPrice.price) && (
                      <span className="text-sm text-muted-foreground line-through">
                        ৳{parseInt(lowestPrice.original_price).toLocaleString()}
                      </span>
                    )}
                </div>
              )}

              {/* Retailer count */}
              <p className="text-sm text-muted-foreground">
                Available at {inStockPrices.length} of {product.prices.length}{" "}
                retailer{product.prices.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Price Comparison */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              {displayPrices.map((price) => (
                <div
                  key={price.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg transition-colors",
                    price.is_available
                      ? "bg-muted/30 hover:bg-muted/50"
                      : "bg-muted/10 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {price.retailer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-semibold",
                        price === lowestPrice && price.is_available
                          ? "text-green-600 dark:text-green-400"
                          : "text-foreground"
                      )}
                    >
                      ৳{parseInt(price.price).toLocaleString()}
                    </span>
                    {price.is_available && (
                      <a
                        href={price.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* Show more/less button */}
              {product.prices.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAllPrices(!showAllPrices)}
                >
                  {showAllPrices ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show {product.prices.length - 2} More
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
