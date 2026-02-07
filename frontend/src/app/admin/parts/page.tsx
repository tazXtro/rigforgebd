"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { motion } from "framer-motion"
import {
    ArrowLeft,
    Plus,
    Trash2,
    Package,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ImageIcon,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import { fetchRetailers, Retailer } from "@/lib/productsApi"
import { adminCreateProduct } from "@/lib/adminProductApi"

// Product categories matching the system
const CATEGORIES = [
    { label: "Processors", value: "Processors" },
    { label: "Graphics Cards", value: "Graphics Cards" },
    { label: "Motherboards", value: "Motherboards" },
    { label: "Memory", value: "Memory" },
    { label: "Storage", value: "Storage" },
    { label: "Power Supply", value: "Power Supply" },
    { label: "Cases", value: "Cases" },
    { label: "Cooling", value: "Cooling" },
    { label: "Monitors", value: "Monitors" },
    { label: "Accessories", value: "Accessories" },
    { label: "Laptops", value: "Laptops" },
    { label: "Pre-builts", value: "Pre-builts" },
]

interface SpecEntry {
    key: string
    value: string
}

export default function AdminAddProductPage() {
    const { user } = useUser()
    const router = useRouter()
    const adminEmail = user?.primaryEmailAddress?.emailAddress || ""

    // Form state
    const [name, setName] = useState("")
    const [category, setCategory] = useState("")
    const [brand, setBrand] = useState("")
    const [imageUrl, setImageUrl] = useState("")
    const [retailerId, setRetailerId] = useState("")
    const [price, setPrice] = useState("")
    const [productUrl, setProductUrl] = useState("")
    const [inStock, setInStock] = useState(true)
    const [specs, setSpecs] = useState<SpecEntry[]>([{ key: "", value: "" }])

    // UI state
    const [retailers, setRetailers] = useState<Retailer[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState("")
    const [createdProductSlug, setCreatedProductSlug] = useState("")

    // Fetch retailers on mount
    useEffect(() => {
        fetchRetailers().then(setRetailers).catch(console.error)
    }, [])

    // Specs handlers
    const addSpec = () => setSpecs([...specs, { key: "", value: "" }])
    const removeSpec = (index: number) => setSpecs(specs.filter((_, i) => i !== index))
    const updateSpec = (index: number, field: "key" | "value", val: string) => {
        const updated = [...specs]
        updated[index][field] = val
        setSpecs(updated)
    }

    // Build specs object from entries
    const buildSpecsObj = (): Record<string, string> => {
        const obj: Record<string, string> = {}
        specs.forEach(({ key, value }) => {
            const k = key.trim()
            const v = value.trim()
            if (k && v) obj[k] = v
        })
        return obj
    }

    // Form validation
    const isValid = name.trim() && category && retailerId && price && productUrl.trim()

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isValid || !adminEmail) return

        setIsLoading(true)
        setStatus("idle")
        setErrorMessage("")

        const { product, error } = await adminCreateProduct({
            admin_email: adminEmail,
            name: name.trim(),
            category,
            brand: brand.trim() || undefined,
            image_url: imageUrl.trim() || undefined,
            specs: buildSpecsObj(),
            retailer_id: retailerId,
            price: parseFloat(price),
            product_url: productUrl.trim(),
            in_stock: inStock,
        })

        setIsLoading(false)

        if (error) {
            setStatus("error")
            setErrorMessage(error)
            return
        }

        setStatus("success")
        if (product) {
            setCreatedProductSlug(product.slug)
        }
    }

    // Reset form
    const resetForm = () => {
        setName("")
        setCategory("")
        setBrand("")
        setImageUrl("")
        setRetailerId("")
        setPrice("")
        setProductUrl("")
        setInStock(true)
        setSpecs([{ key: "", value: "" }])
        setStatus("idle")
        setErrorMessage("")
        setCreatedProductSlug("")
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
                <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Admin
                    </Link>
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30">
                        <Package className="w-3 h-3 mr-1" />
                        Add Product
                    </Badge>
                </div>
            </div>

            <main className="container max-w-4xl mx-auto px-4 py-8">
                {/* Success State */}
                {status === "success" && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-green-500/30 bg-green-500/5 mb-6">
                            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="p-3 rounded-full bg-green-500/10">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-green-700 dark:text-green-400">
                                        Product Created Successfully!
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        The product has been added to the catalog.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {createdProductSlug && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.push(
                                                    `/products/${category.toLowerCase().replace(/\s+/g, "-")}/${createdProductSlug}`
                                                )
                                            }
                                        >
                                            View Product
                                        </Button>
                                    )}
                                    <Button size="sm" onClick={resetForm}>
                                        Add Another
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Error State */}
                {status === "error" && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-red-500/30 bg-red-500/5 mb-6">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="p-3 rounded-full bg-red-500/10">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-700 dark:text-red-400">
                                        Failed to Create Product
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Product Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. AMD Ryzen 7 7800X3D Processor"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">
                                        Category <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="brand">Brand</Label>
                                    <Input
                                        id="brand"
                                        placeholder="e.g. AMD, Intel, NVIDIA"
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="imageUrl">Image URL</Label>
                                <div className="flex gap-3">
                                    <Input
                                        id="imageUrl"
                                        placeholder="https://example.com/product-image.jpg"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="flex-1"
                                    />
                                    {imageUrl && (
                                        <div className="w-12 h-12 rounded-lg border bg-muted/50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            <img
                                                src={imageUrl}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none"
                                                }}
                                            />
                                        </div>
                                    )}
                                    {!imageUrl && (
                                        <div className="w-12 h-12 rounded-lg border bg-muted/50 flex-shrink-0 flex items-center justify-center">
                                            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Retailer & Pricing */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Retailer & Pricing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="retailer">
                                        Retailer <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={retailerId} onValueChange={setRetailerId}>
                                        <SelectTrigger id="retailer">
                                            <SelectValue placeholder="Select retailer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {retailers.map((r) => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price">
                                        Price (BDT) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g. 42500"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="productUrl">
                                    Product URL <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="productUrl"
                                    type="url"
                                    placeholder="https://startech.com.bd/amd-ryzen-7-7800x3d"
                                    value={productUrl}
                                    onChange={(e) => setProductUrl(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setInStock(!inStock)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${
                                        inStock ? "bg-green-500" : "bg-muted-foreground/30"
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                                            inStock ? "translate-x-5" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                                <Label className="cursor-pointer" onClick={() => setInStock(!inStock)}>
                                    {inStock ? "In Stock" : "Out of Stock"}
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Specifications */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Specifications</CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSpec}
                                className="gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Spec
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {specs.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No specifications added. Click &quot;Add Spec&quot; to begin.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {specs.map((spec, index) => (
                                        <div key={index} className="flex gap-2 items-start">
                                            <Input
                                                placeholder="Key (e.g. Socket)"
                                                value={spec.key}
                                                onChange={(e) => updateSpec(index, "key", e.target.value)}
                                                className="flex-1"
                                            />
                                            <Input
                                                placeholder="Value (e.g. AM5)"
                                                value={spec.value}
                                                onChange={(e) => updateSpec(index, "value", e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeSpec(index)}
                                                className="text-muted-foreground hover:text-red-500 flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/admin")}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid || isLoading}
                            className="min-w-[140px] gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Product
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    )
}
