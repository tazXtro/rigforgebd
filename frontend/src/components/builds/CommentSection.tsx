"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Loader2, User, Trash2, MessageSquareOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BuildComment } from "./types"
import { getComments, addComment, deleteComment } from "@/lib/buildsApi"
import { cn } from "@/lib/utils"

interface CommentSectionProps {
    buildId: string
    commentsEnabled: boolean
    authorId: string
}

export function CommentSection({ buildId, commentsEnabled, authorId }: CommentSectionProps) {
    const { user } = useUser()
    const [comments, setComments] = useState<BuildComment[]>([])
    const [newComment, setNewComment] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        if (commentsEnabled) {
            loadComments()
        } else {
            setIsLoading(false)
        }
    }, [buildId, commentsEnabled])

    const loadComments = async () => {
        try {
            const data = await getComments(buildId)
            setComments(data)
        } catch (error) {
            console.error("Failed to load comments:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!user || !newComment.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            const comment = await addComment(
                buildId,
                {
                    id: user.id,
                    username: user.username || user.firstName || "Anonymous",
                    avatarUrl: user.imageUrl,
                },
                newComment.trim()
            )
            setComments((prev) => [...prev, comment])
            setNewComment("")
        } catch (error) {
            console.error("Failed to add comment:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (commentId: string) => {
        if (deletingId) return

        setDeletingId(commentId)
        try {
            await deleteComment(buildId, commentId)
            setComments((prev) => prev.filter((c) => c.id !== commentId))
        } catch (error) {
            console.error("Failed to delete comment:", error)
        } finally {
            setDeletingId(null)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`

        return date.toLocaleDateString("en-BD", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    if (!commentsEnabled) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <MessageSquareOff className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Comments Disabled</h3>
                <p className="text-muted-foreground">
                    The author has disabled comments for this build.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">
                Comments ({comments.length})
            </h3>

            {/* Comment Form */}
            {user ? (
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        {user.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt={user.username || "User"}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                        )}
                    </div>
                    <div className="flex-1 flex gap-2">
                        <Input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            disabled={isSubmitting}
                            maxLength={500}
                        />
                        <Button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            size="icon"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </form>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                    <a href="/sign-in" className="text-primary hover:underline">
                        Sign in
                    </a>{" "}
                    to leave a comment
                </p>
            )}

            {/* Comments List */}
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-24" />
                                <div className="h-3 bg-muted rounded w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                    No comments yet. Be the first to comment!
                </p>
            ) : (
                <AnimatePresence initial={false}>
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex gap-3 group"
                            >
                                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                    {comment.authorAvatar ? (
                                        <img
                                            src={comment.authorAvatar}
                                            alt={comment.authorUsername}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <User className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium">
                                            {comment.authorUsername}
                                        </span>
                                        {comment.authorId === authorId && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                Author
                                            </span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(comment.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/80 break-words">
                                        {comment.content}
                                    </p>
                                </div>
                                {/* Delete button (for comment author or build author) */}
                                {user && (user.id === comment.authorId || user.id === authorId) && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(comment.id)}
                                        disabled={deletingId === comment.id}
                                    >
                                        {deletingId === comment.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        )}
                                    </Button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}
        </div>
    )
}
