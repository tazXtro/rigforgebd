// Types for the Builds feature

import { ComponentSlot, ComponentCategory } from "../builder/types"

export type { ComponentCategory }

export interface BuildAuthor {
    id: string
    username: string
    avatarUrl?: string
}

export interface BuildComment {
    id: string
    buildId: string
    authorId: string
    authorUsername: string
    authorAvatar?: string
    content: string
    createdAt: string
    updatedAt?: string
}

export interface BuildVote {
    id: string
    buildId: string
    userId: string
    type: "upvote" | "downvote"
    createdAt: string
}

export interface Build {
    id: string
    title: string
    description: string
    imageUrl: string
    buildDate: string // Date when user built their PC
    createdAt: string // Date when build was published on the platform
    updatedAt?: string
    author: BuildAuthor
    components: ComponentSlot[] // The system builder configuration
    totalPrice: number
    isFeatured: boolean
    commentsEnabled: boolean
    upvotes: number
    downvotes: number
    commentCount: number
    // User's vote status (for logged-in user)
    userVote?: "upvote" | "downvote" | null
}

export interface BuildFormData {
    title: string
    description: string
    imageUrl: string
    buildDate: string
    commentsEnabled: boolean
    components: ComponentSlot[]
    totalPrice: number
}

export interface BuildsFilter {
    sortBy: "newest" | "popular" | "mostVoted"
    featured?: boolean
    search?: string
}

export interface BuildsResponse {
    builds: Build[]
    total: number
    page: number
    pageSize: number
}
