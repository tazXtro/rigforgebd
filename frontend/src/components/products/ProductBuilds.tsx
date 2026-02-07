"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    Cpu,
    ThumbsUp,
    ThumbsDown,
    MessageCircle,
    Calendar,
    Star,
    User,
    ChevronRight,
    Hammer,
    Loader2,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getBuildsByProduct } from "@/lib/buildsApi"
import { Build } from "@/components/builds/types"

interface ProductBuildsProps {
    productName: string
}

export function ProductBuilds({ productName }: ProductBuildsProps) {
    const [builds, setBuilds] = useState<Build[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function fetchBuilds() {
            setIsLoading(true)
            setError(null)
            try {
                const data = await getBuildsByProduct(productName, 6)
                if (!cancelled) {
                    setBuilds(data)
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Failed to load builds")
                    console.error("Error fetching builds by product:", err)
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        fetchBuilds()
        return () => { cancelled = true }
    }, [productName])

    const formatPrice = (price: number) =>
        `৳${price.toLocaleString("en-BD")}`

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("en-BD", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })

    // Don't render the section if loading finished and no builds found
    if (!isLoading && builds.length === 0) {
        return null
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Hammer className="w-5 h-5 text-muted-foreground" />
                        Builds Using This Component
                    </CardTitle>
                    {builds.length > 0 && (
                        <Link href="/builds">
                            <Button variant="ghost" size="sm" className="gap-1 text-sm text-muted-foreground hover:text-foreground">
                                View All Builds
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    )}
                </div>
                {builds.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                        {builds.length} build{builds.length !== 1 ? "s" : ""} found using this product
                    </p>
                )}
            </CardHeader>
            <CardContent className="p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading builds...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {builds.map((build, index) => (
                                <BuildMiniCard
                                    key={build.id}
                                    build={build}
                                    index={index}
                                    formatPrice={formatPrice}
                                    formatDate={formatDate}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

interface BuildMiniCardProps {
    build: Build
    index: number
    formatPrice: (price: number) => string
    formatDate: (date: string) => string
}

function BuildMiniCard({ build, index, formatPrice, formatDate }: BuildMiniCardProps) {
    const imageUrl = build.imageUrl || "/placeholder-build.svg"
    const isDataUrl = imageUrl.startsWith("data:")
    const voteScore = build.upvotes - build.downvotes

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
        >
            <Link href={`/builds/${build.id}`}>
                <Card className="overflow-hidden h-full hover:shadow-md transition-all duration-300 group cursor-pointer border-border/50 hover:border-primary/30">
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                        {isDataUrl ? (
                            <img
                                src={imageUrl}
                                alt={build.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <Image
                                src={imageUrl}
                                alt={build.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        )}
                        {build.isFeatured && (
                            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground gap-1 text-xs px-1.5 py-0.5">
                                <Star className="h-3 w-3 fill-current" />
                                Featured
                            </Badge>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                            <p className="text-white font-semibold text-sm line-clamp-1">
                                {build.title}
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-3">
                        {/* Author */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="relative h-6 w-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                {build.author.avatarUrl ? (
                                    <Image
                                        src={build.author.avatarUrl}
                                        alt={build.author.username}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <User className="h-3 w-3 text-muted-foreground" />
                                )}
                            </div>
                            <span className="text-xs font-medium truncate">
                                {build.author.username}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1 shrink-0">
                                <Calendar className="h-3 w-3" />
                                {formatDate(build.buildDate)}
                            </span>
                        </div>

                        {/* Price & Components */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-primary">
                                {formatPrice(build.totalPrice)}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Cpu className="h-3 w-3" />
                                {build.components.filter(c => c.product).length} parts
                            </div>
                        </div>
                    </CardContent>

                    {/* Footer - Votes & Comments */}
                    <CardFooter className="px-3 py-2 pt-0 flex items-center justify-between border-t border-border/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn(
                                "flex items-center gap-0.5",
                                voteScore > 0 && "text-green-500",
                                voteScore < 0 && "text-red-500"
                            )}>
                                <ThumbsUp className="h-3 w-3" />
                                {build.upvotes}
                            </span>
                            <span className="flex items-center gap-0.5">
                                <ThumbsDown className="h-3 w-3" />
                                {build.downvotes}
                            </span>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            {build.commentCount}
                        </span>
                    </CardFooter>
                </Card>
            </Link>
        </motion.div>
    )
}
