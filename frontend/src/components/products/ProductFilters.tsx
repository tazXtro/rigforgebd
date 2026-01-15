"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProductFilters as ProductFiltersType, GPUFiltersResponse } from "@/types/product";

interface ProductFiltersProps {
  filters: ProductFiltersType;
  filterOptions: GPUFiltersResponse | null;
  onFilterChange: (filters: ProductFiltersType) => void;
  isLoading?: boolean;
}

export function ProductFilters({
  filters,
  filterOptions,
  onFilterChange,
  isLoading,
}: ProductFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    brand: true,
    memory: true,
    price: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilter = (key: keyof ProductFiltersType, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
      page: 1, // Reset to first page on filter change
    });
  };

  const clearFilters = () => {
    onFilterChange({
      page: 1,
      page_size: filters.page_size,
    });
  };

  const activeFilterCount = [
    filters.brand,
    filters.memory_size,
    filters.chipset,
    filters.min_price,
    filters.max_price,
    filters.search,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-sm font-medium">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search products..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value || undefined)}
            className="pl-10 bg-background"
          />
        </div>
      </div>

      {/* Brand Filter */}
      {filterOptions?.brands && filterOptions.brands.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => toggleSection("brand")}
            className="flex items-center justify-between w-full text-sm font-medium"
          >
            Brand
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.brand && "rotate-180"
              )}
            />
          </button>
          {expandedSections.brand && (
            <div className="flex flex-wrap gap-2 pt-2">
              {filterOptions.brands.map((brand) => (
                <Badge
                  key={brand}
                  variant={filters.brand === brand ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    filters.brand === brand
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() =>
                    updateFilter("brand", filters.brand === brand ? undefined : brand)
                  }
                >
                  {brand}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Memory Size Filter */}
      {filterOptions?.memory_sizes && filterOptions.memory_sizes.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => toggleSection("memory")}
            className="flex items-center justify-between w-full text-sm font-medium"
          >
            VRAM
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.memory && "rotate-180"
              )}
            />
          </button>
          {expandedSections.memory && (
            <div className="flex flex-wrap gap-2 pt-2">
              {filterOptions.memory_sizes.map((size) => (
                <Badge
                  key={size}
                  variant={filters.memory_size === size ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    filters.memory_size === size
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() =>
                    updateFilter(
                      "memory_size",
                      filters.memory_size === size ? undefined : size
                    )
                  }
                >
                  {size}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Range Filter */}
      {filterOptions?.price_range && (
        <div className="space-y-2">
          <button
            onClick={() => toggleSection("price")}
            className="flex items-center justify-between w-full text-sm font-medium"
          >
            Price Range
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.price && "rotate-180"
              )}
            />
          </button>
          {expandedSections.price && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="min-price" className="text-xs text-muted-foreground">
                    Min (৳)
                  </Label>
                  <Input
                    id="min-price"
                    type="number"
                    placeholder={filterOptions.price_range.min.toString()}
                    value={filters.min_price || ""}
                    onChange={(e) =>
                      updateFilter(
                        "min_price",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="bg-background"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="max-price" className="text-xs text-muted-foreground">
                    Max (৳)
                  </Label>
                  <Input
                    id="max-price"
                    type="number"
                    placeholder={filterOptions.price_range.max.toString()}
                    value={filters.max_price || ""}
                    onChange={(e) =>
                      updateFilter(
                        "max_price",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="bg-background"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Range: ৳{filterOptions.price_range.min.toLocaleString()} - ৳
                {filterOptions.price_range.max.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Mobile Filters Dropdown */}
        {showMobileFilters && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <FilterContent />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Filters Sidebar */}
      <div className="hidden lg:block">
        <Card className="sticky top-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FilterContent />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
