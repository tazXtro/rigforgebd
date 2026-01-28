"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import {
    Upload,
    ImageIcon,
    MessageSquare,
    Loader2,
    AlertCircle,
    X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useBuilder } from "@/components/builder"
import { createBuild } from "@/lib/buildsApi"
import { BuildFormData } from "./types"
import { cn } from "@/lib/utils"

interface PublishBuildFormProps {
    onSuccess?: () => void
    onCancel?: () => void
}

export function PublishBuildForm({ onSuccess, onCancel }: PublishBuildFormProps) {
    const router = useRouter()
    const { user } = useUser()
    const { slots, getTotalPrice, clearBuild } = useBuilder()

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        imageUrl: "",
        commentsEnabled: true,
    })

    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const selectedSlots = slots.filter((s) => s.product !== null)
    const hasComponents = selectedSlots.length > 0

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // For testing, we'll use a data URL
            const reader = new FileReader()
            reader.onloadend = () => {
                const dataUrl = reader.result as string
                setImagePreview(dataUrl)
                setFormData((prev) => ({ ...prev, imageUrl: dataUrl }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleToggleComments = () => {
        setFormData((prev) => ({ ...prev, commentsEnabled: !prev.commentsEnabled }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!user) {
            setError("You must be signed in to publish a build")
            return
        }

        if (!hasComponents) {
            setError("You must add at least one component to your build")
            return
        }

        if (!formData.title.trim()) {
            setError("Please enter a title for your build")
            return
        }

        if (!formData.description.trim()) {
            setError("Please enter a description for your build")
            return
        }

        if (!formData.imageUrl) {
            setError("Please upload an image of your build")
            return
        }

        setIsSubmitting(true)

        try {
            const buildData: BuildFormData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                imageUrl: formData.imageUrl,
                buildDate: new Date().toISOString(),
                commentsEnabled: formData.commentsEnabled,
                components: selectedSlots,
                totalPrice: getTotalPrice(),
            }

            await createBuild(buildData, {
                id: user.id,
                username: user.username || user.firstName || "Anonymous",
                avatarUrl: user.imageUrl,
            })

            // Clear the builder after successful publish
            clearBuild()

            onSuccess?.()
            router.push("/builds")
        } catch (err) {
            console.error("Failed to publish build:", err)
            setError("Failed to publish your build. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("en-BD", {
            style: "currency",
            currency: "BDT",
            minimumFractionDigits: 0,
        }).format(price)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </motion.div>
            )}

            {/* Components Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Build Components</CardTitle>
                    <CardDescription>
                        {hasComponents
                            ? `${selectedSlots.length} components selected • ${formatPrice(getTotalPrice())}`
                            : "No components added. Go to System Builder to add components."}
                    </CardDescription>
                </CardHeader>
                {hasComponents && (
                    <CardContent>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedSlots.map((slot) => (
                                <div
                                    key={slot.id}
                                    className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">
                                            {slot.category}
                                        </span>
                                        <span className="text-foreground">
                                            {slot.product?.name}
                                        </span>
                                        {slot.quantity > 1 && (
                                            <span className="text-muted-foreground">
                                                x{slot.quantity}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-primary font-medium">
                                        {formatPrice((slot.product?.minPrice || 0) * slot.quantity)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">
                    Build Title <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="title"
                    name="title"
                    placeholder="e.g., My First Gaming Build"
                    value={formData.title}
                    onChange={handleInputChange}
                    maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                    {formData.title.length}/100 characters
                </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                </Label>
                <textarea
                    id="description"
                    name="description"
                    placeholder="Tell the community about your build. What games do you play? What was your budget? Any tips for others?"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={2000}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                    {formData.description.length}/2000 characters
                </p>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
                <Label>
                    Build Image <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors">
                    {imagePreview ? (
                        <div className="relative w-full aspect-video max-w-md">
                            <Image
                                src={imagePreview}
                                alt="Build preview"
                                fill
                                className="object-contain rounded-lg"
                            />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={() => {
                                    setImagePreview(null)
                                    setFormData((prev) => ({ ...prev, imageUrl: "" }))
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center cursor-pointer">
                            <div className="p-4 bg-muted rounded-full mb-4">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium mb-1">
                                Click to upload an image
                            </span>
                            <span className="text-xs text-muted-foreground">
                                PNG, JPG up to 10MB
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>
            </div>

            {/* Comments Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm font-medium">Enable Comments</p>
                        <p className="text-xs text-muted-foreground">
                            Allow others to comment on your build
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleToggleComments}
                    className={cn(
                        "relative w-12 h-6 rounded-full transition-colors",
                        formData.commentsEnabled ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                >
                    <motion.div
                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
                        animate={{ x: formData.commentsEnabled ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                </button>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={isSubmitting || !hasComponents}
                    className="flex-1 gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Publishing...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            Publish Build
                        </>
                    )}
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
            </div>

            {/* Redirect to Builder Link */}
            {!hasComponents && (
                <p className="text-center text-sm text-muted-foreground">
                    <a href="/builder" className="text-primary hover:underline">
                        Go to System Builder
                    </a>{" "}
                    to add components first
                </p>
            )}
        </form>
    )
}
