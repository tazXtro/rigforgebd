"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { motion } from "framer-motion"
import {
    ArrowLeft,
    ThumbsUp,
    ThumbsDown,
    Calendar,
    Clock,
    Star,
    Share2,
    User,
    Cpu,
    HardDrive,
    MemoryStick,
    Monitor,
    Fan,
    Zap,
    Box,
    ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Build, ComponentCategory } from "./types"
import { CommentSection } from "./CommentSection"
import { voteBuild, SanctionError } from "@/lib/buildsApi"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface BuildDetailProps {
    build: Build
    onBuildUpdate?: (build: Build) => void
}

const categoryIcons: Record<string, React.ElementType> = {
    CPU: Cpu,
    Motherboard: HardDrive,
    RAM: MemoryStick,
    Storage: HardDrive,
    GPU: Monitor,
    PSU: Zap,
    Case: Box,
    Cooler: Fan,
    Monitor: Monitor,
}

export function BuildDetail({ build: initialBuild, onBuildUpdate }: BuildDetailProps) {
    const { user } = useUser()
    const [build, setBuild] = useState(initialBuild)
    const [isVoting, setIsVoting] = useState(false)

    const handleVote = async (voteType: "upvote" | "downvote") => {
        if (!user || isVoting) return

        const email = user.primaryEmailAddress?.emailAddress
        if (!email) {
            console.error("User email not found")
            return
        }

        setIsVoting(true)
        try {
            const updatedBuild = await voteBuild(build.id, email, voteType)
            setBuild(updatedBuild)
            onBuildUpdate?.(updatedBuild)
        } catch (error) {
            if (error instanceof SanctionError) {
                toast.error(error.message, { duration: 5000 })
                if (error.reason) {
                    setTimeout(() => {
                        toast.warning(`Reason: ${error.reason}`, { duration: 6000 })
                    }, 800)
                }
            } else {
                const message = error instanceof Error ? error.message : "Failed to vote"
                toast.error(message)
            }
        } finally {
            setIsVoting(false)
        }
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: build.title,
                    text: `Check out this PC build: ${build.title}`,
                    url: window.location.href,
                })
            } catch (error) {
                console.log("Share cancelled")
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href)
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("en-BD", {
            style: "currency",
            currency: "BDT",
            minimumFractionDigits: 0,
        }).format(price)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-BD", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    // Group components by category
    const componentsByCategory = build.components.reduce(
        (acc, slot) => {
            if (slot.product) {
                if (!acc[slot.category]) {
                    acc[slot.category] = []
                }
                acc[slot.category].push(slot)
            }
            return acc
        },
        {} as Record<string, typeof build.components>
    )

    const imageUrl = build.imageUrl || "/placeholder-build.svg"
    const isDataUrl = imageUrl.startsWith("data:")

    return (
        <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <Link
                href="/builds"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Builds
            </Link>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Build Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative aspect-video rounded-xl overflow-hidden bg-muted"
                    >
                        {isDataUrl ? (
                            <img
                                src={imageUrl}
                                alt={build.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <Image
                                src={imageUrl}
                                alt={build.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        )}
                        {build.isFeatured && (
                            <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                Featured Build
                            </Badge>
                        )}
                    </motion.div>

                    {/* Title and Meta */}
                    <div>
                        <h1 className="text-3xl font-bold mb-3">{build.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="relative h-6 w-6 rounded-full overflow-hidden bg-muted">
                                    {build.author.avatarUrl ? (
                                        <Image
                                            src={build.author.avatarUrl}
                                            alt={build.author.username}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <User className="h-4 w-4 m-1" />
                                    )}
                                </div>
                                <span className="font-medium text-foreground">
                                    {build.author.username}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Built {formatDate(build.buildDate)}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Posted {formatDate(build.createdAt)}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">About This Build</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground/80 whitespace-pre-wrap">
                                {build.description}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Components List */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Components</CardTitle>
                            <Link href={`/builds/${build.id}/system-builder`}>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Cpu className="h-4 w-4" />
                                    View in System Builder
                                    <ExternalLink className="h-3 w-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(componentsByCategory).map(([category, slots]) => {
                                const IconComponent = categoryIcons[category] || Box
                                return (
                                    <div key={category}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <IconComponent className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium text-muted-foreground uppercase">
                                                {category}
                                            </span>
                                        </div>
                                        {slots.map((slot) => (
                                            <div
                                                key={slot.id}
                                                className="flex items-center justify-between py-2 pl-6 border-l-2 border-muted ml-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {slot.product?.image && (
                                                        <div className="relative h-12 w-12 rounded bg-muted overflow-hidden">
                                                            <Image
                                                                src={slot.product.image}
                                                                alt={slot.product.name}
                                                                fill
                                                                className="object-contain p-1"
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium">
                                                            {slot.product?.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {slot.product?.brand}
                                                            {slot.quantity > 1 && ` × ${slot.quantity}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-primary font-medium">
                                                    {formatPrice(
                                                        (slot.product?.minPrice || 0) * slot.quantity
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between text-lg font-bold">
                                <span>Total</span>
                                <span className="text-primary">
                                    {formatPrice(build.totalPrice)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Comments Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Discussion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CommentSection
                                buildId={build.id}
                                commentsEnabled={build.commentsEnabled}
                                authorId={build.author.id}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Vote Card */}
                    <Card className="sticky top-20">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="text-4xl font-bold mb-2">
                                    {build.upvotes - build.downvotes}
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Community Score
                                </p>

                                <div className="flex gap-2 w-full mb-4">
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "flex-1 gap-2",
                                            build.userVote === "upvote" &&
                                                "bg-green-500/10 border-green-500 text-green-500"
                                        )}
                                        onClick={() => handleVote("upvote")}
                                        disabled={isVoting || !user}
                                    >
                                        <ThumbsUp className="h-4 w-4" />
                                        {build.upvotes}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "flex-1 gap-2",
                                            build.userVote === "downvote" &&
                                                "bg-red-500/10 border-red-500 text-red-500"
                                        )}
                                        onClick={() => handleVote("downvote")}
                                        disabled={isVoting || !user}
                                    >
                                        <ThumbsDown className="h-4 w-4" />
                                        {build.downvotes}
                                    </Button>
                                </div>

                                {!user && (
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Sign in to vote
                                    </p>
                                )}

                                <Button
                                    variant="outline"
                                    className="w-full gap-2"
                                    onClick={handleShare}
                                >
                                    <Share2 className="h-4 w-4" />
                                    Share Build
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Price Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Price Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary mb-2">
                                {formatPrice(build.totalPrice)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {build.components.length} components total
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
