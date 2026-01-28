"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ThumbsUp, ThumbsDown, MessageCircle, Calendar, Star, User } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Build } from "./types"
import { cn } from "@/lib/utils"

interface BuildCardProps {
    build: Build
    onVote?: (buildId: string, voteType: "upvote" | "downvote") => void
    isVoting?: boolean
}

export function BuildCard({ build, onVote, isVoting }: BuildCardProps) {
    const voteScore = build.upvotes - build.downvotes

    const handleVote = (e: React.MouseEvent, voteType: "upvote" | "downvote") => {
        e.preventDefault()
        e.stopPropagation()
        onVote?.(build.id, voteType)
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("en-BD", {
            style: "currency",
            currency: "BDT",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-BD", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    const imageUrl = build.imageUrl || "/placeholder-build.svg"
    const isDataUrl = imageUrl.startsWith("data:")

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -4 }}
        >
            <Link href={`/builds/${build.id}`}>
                <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300 group cursor-pointer">
                    {/* Image Section */}
                    <div className="relative aspect-[4/3] overflow-hidden">
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
                            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                Featured
                            </Badge>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <p className="text-white font-semibold text-lg line-clamp-1">
                                {build.title}
                            </p>
                        </div>
                    </div>

                    {/* Content Section */}
                    <CardContent className="p-4">
                        {/* Author Info */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                {build.author.avatarUrl ? (
                                    <Image
                                        src={build.author.avatarUrl}
                                        alt={build.author.username}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <User className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {build.author.username}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(build.buildDate)}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {build.description}
                        </p>

                        {/* Price */}
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">
                                {formatPrice(build.totalPrice)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {build.components.length} components
                            </span>
                        </div>
                    </CardContent>

                    {/* Footer - Votes and Comments */}
                    <CardFooter className="p-4 pt-0 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleVote(e, "upvote")}
                                disabled={isVoting}
                                className={cn(
                                    "h-8 px-2 gap-1",
                                    build.userVote === "upvote" && "text-green-500"
                                )}
                            >
                                <ThumbsUp className="h-4 w-4" />
                                <span className="text-xs">{build.upvotes}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleVote(e, "downvote")}
                                disabled={isVoting}
                                className={cn(
                                    "h-8 px-2 gap-1",
                                    build.userVote === "downvote" && "text-red-500"
                                )}
                            >
                                <ThumbsDown className="h-4 w-4" />
                                <span className="text-xs">{build.downvotes}</span>
                            </Button>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs">{build.commentCount}</span>
                        </div>
                    </CardFooter>
                </Card>
            </Link>
        </motion.div>
    )
}
