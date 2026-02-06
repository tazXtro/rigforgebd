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
    Info,
    CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useBuilder } from "@/components/builder"
import { createBuild, uploadBuildImage } from "@/lib/buildsApi"
import { compressImage } from "@/lib/imageCompression"
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
    const [imageFile, setImageFile] = useState<string | null>(null) // Base64 image data for upload
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const selectedSlots = slots.filter((s) => s.product !== null)
    const hasComponents = selectedSlots.length > 0

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file size (10MB max for input - will be compressed)
            const maxSize = 10 * 1024 * 1024 // 10MB
            if (file.size > maxSize) {
                setError("Image size must be less than 10MB")
                return
            }

            // Validate file type
            const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
            if (!allowedTypes.includes(file.type)) {
                setError("Please upload a valid image (JPG, PNG, GIF, or WebP)")
                return
            }

            setError(null)
            setIsCompressing(true)

            try {
                // Compress the image before storing
                const result = await compressImage(file, {
                    maxDimension: 1920,  // Max 1920px width/height
                    maxSizeMB: 0.5,      // Target 500KB max
                    quality: 0.8,        // 80% quality
                    fileType: "image/webp", // WebP for best compression
                })

                setImagePreview(result.dataUrl)
                setImageFile(result.dataUrl)
            } catch (err) {
                console.error("Failed to compress image:", err)
                setError("Failed to process image. Please try a different image.")
            } finally {
                setIsCompressing(false)
            }
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

        if (!imageFile) {
            setError("Please upload an image of your build")
            return
        }

        setIsSubmitting(true)

        try {
            const email = user.primaryEmailAddress?.emailAddress || ""
            if (!email) {
                setError("User email not found. Please try signing in again.")
                setIsSubmitting(false)
                return
            }

            // Step 1: Upload image to Supabase Storage
            setIsUploading(true)
            const uploadResult = await uploadBuildImage(imageFile, email)
            setIsUploading(false)

            if (!uploadResult.success || !uploadResult.url) {
                setError(uploadResult.error || "Failed to upload image. Please try again.")
                setIsSubmitting(false)
                return
            }

            // Step 2: Create build with the storage URL
            const buildData: BuildFormData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                imageUrl: uploadResult.url, // Use the storage URL instead of base64
                buildDate: new Date().toISOString(),
                commentsEnabled: formData.commentsEnabled,
                components: selectedSlots,
                totalPrice: getTotalPrice(),
            }

            await createBuild(buildData, {
                id: user.id,
                username: user.username || email.split("@")[0] || "Anonymous",
                email: email,
                avatarUrl: user.imageUrl,
            })

            // Clear the builder after successful publish
            clearBuild()

            // Show success state with pending approval message
            setIsSubmitted(true)
            onSuccess?.()
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
        <>
            {/* Success State - Pending Approval */}
            {isSubmitted ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                >
                    <Card className="border-yellow-500/50 bg-yellow-500/5">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="rounded-full bg-yellow-500/20 p-4">
                                    <CheckCircle2 className="h-12 w-12 text-yellow-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold">Build Submitted!</h2>
                                    <p className="text-muted-foreground max-w-md">
                                        Your build has been submitted for review. An admin will
                                        review and approve it shortly. You&apos;ll be able to see
                                        your build on the Builds page once approved.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-muted rounded-lg text-left w-full max-w-md mt-2">
                                    <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">What happens next?</p>
                                        <ul className="text-muted-foreground mt-1 space-y-1">
                                            <li>• Our team reviews all submitted builds</li>
                                            <li>• Approved builds appear publicly within 24-48 hours</li>
                                            <li>• You&apos;ll be notified if any changes are needed</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <Button variant="outline" onClick={() => router.push("/builder")}>
                                        Create Another Build
                                    </Button>
                                    <Button onClick={() => router.push("/builds")}>
                                        Browse Builds
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
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

                    {/* Info Alert about Approval */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-start gap-3 p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20"
                    >
                        <Info className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-sm">
                            All builds are reviewed by our team before appearing publicly.
                            This helps ensure quality and appropriate content.
                        </p>
                    </motion.div>

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
                            {isCompressing ? (
                                <div className="flex flex-col items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                    <span className="text-sm text-muted-foreground">
                                        Optimizing image...
                                    </span>
                                </div>
                            ) : imagePreview ? (
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
                                            setImageFile(null)
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
                                        PNG, JPG, GIF, WebP up to 10MB (auto-optimized)
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
                            disabled={isSubmitting || isCompressing || !hasComponents || !imageFile}
                            className="flex-1 gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isUploading ? "Uploading image..." : "Publishing..."}
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
            )}
        </>
    )
}
