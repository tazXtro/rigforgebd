import { Build, BuildFormData, BuildComment, BuildsFilter, BuildsResponse } from "@/components/builds/types"

// Backend API base URL
// NEXT_PUBLIC_API_URL should be "http://localhost:8000/api" (already includes /api)
// Note: Django requires trailing slashes on all URLs
const BACKEND_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const API_BASE = `${BACKEND_API_BASE}/builds`

/**
 * Get paginated list of builds with optional filtering and sorting
 */
export async function getBuilds(
    filter?: BuildsFilter,
    page = 1,
    pageSize = 12,
    userEmail?: string
): Promise<BuildsResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
    })

    if (filter?.sortBy) params.append("sortBy", filter.sortBy)
    if (filter?.featured !== undefined) params.append("featured", filter.featured.toString())
    if (filter?.search) params.append("search", filter.search)
    if (userEmail) params.append("userEmail", userEmail)

    const response = await fetch(`${API_BASE}/?${params.toString()}`)
    if (!response.ok) {
        throw new Error("Failed to fetch builds")
    }
    return response.json()
}

/**
 * Get a single build by ID
 */
export async function getBuildById(id: string, userEmail?: string): Promise<Build | null> {
    const params = new URLSearchParams()
    if (userEmail) params.append("userEmail", userEmail)
    
    const url = params.toString() ? `${API_BASE}/${id}/?${params.toString()}` : `${API_BASE}/${id}/`
    const response = await fetch(url)
    
    if (!response.ok) {
        if (response.status === 404) return null
        throw new Error("Failed to fetch build")
    }
    return response.json()
}

/**
 * Get featured builds
 */
export async function getFeaturedBuilds(limit = 6, userEmail?: string): Promise<Build[]> {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (userEmail) params.append("userEmail", userEmail)
    
    const response = await fetch(`${API_BASE}/featured/?${params.toString()}`)
    if (!response.ok) {
        throw new Error("Failed to fetch featured builds")
    }
    return response.json()
}

/**
 * Create a new build
 * @param data - Build form data
 * @param author - Author information including email for lookup
 */
export async function createBuild(
    data: BuildFormData,
    author: { id: string; username: string; email: string; avatarUrl?: string }
): Promise<Build> {
    const response = await fetch(`${API_BASE}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
            buildDate: data.buildDate,
            commentsEnabled: data.commentsEnabled,
            components: data.components,
            totalPrice: data.totalPrice,
            author: {
                id: author.id,
                username: author.username,
                email: author.email,
                avatarUrl: author.avatarUrl,
            },
        }),
    })
    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to create build")
    }
    return response.json()
}

/**
 * Update an existing build
 */
export async function updateBuild(
    id: string,
    data: Partial<BuildFormData>,
    userEmail: string
): Promise<Build> {
    const response = await fetch(`${API_BASE}/${id}/?userEmail=${encodeURIComponent(userEmail)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        throw new Error("Failed to update build")
    }
    return response.json()
}

/**
 * Delete a build
 */
export async function deleteBuild(id: string, userEmail: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}/?userEmail=${encodeURIComponent(userEmail)}`, {
        method: "DELETE",
    })
    if (!response.ok) {
        throw new Error("Failed to delete build")
    }
}

// ==================== Voting ====================

export class SanctionError extends Error {
    reason?: string
    constructor(message: string, reason?: string) {
        super(message)
        this.name = "SanctionError"
        this.reason = reason
    }
}

/**
 * Vote on a build (upvote or downvote)
 */
export async function voteBuild(
    buildId: string,
    userEmail: string,
    voteType: "upvote" | "downvote"
): Promise<Build> {
    const response = await fetch(`${API_BASE}/${buildId}/vote/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, voteType }),
    })
    if (!response.ok) {
        const data = await response.json().catch(() => null)
        if (response.status === 403 && data?.error) {
            throw new SanctionError(data.error, data.reason)
        }
        throw new Error(data?.error || "Failed to vote on build")
    }
    return response.json()
}

/**
 * Remove a vote from a build
 */
export async function removeVote(buildId: string, userEmail: string): Promise<Build> {
    const response = await fetch(`${API_BASE}/${buildId}/vote/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail }),
    })
    if (!response.ok) {
        throw new Error("Failed to remove vote")
    }
    return response.json()
}

// ==================== Comments ====================

interface CommentsResponse {
    comments: BuildComment[]
    total: number
    page: number
    pageSize: number
}

/**
 * Get comments for a build
 */
export async function getComments(
    buildId: string,
    page = 1,
    pageSize = 20
): Promise<CommentsResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
    })
    
    const response = await fetch(`${API_BASE}/${buildId}/comments/?${params.toString()}`)
    if (!response.ok) {
        throw new Error("Failed to fetch comments")
    }
    return response.json()
}

/**
 * Add a comment to a build
 */
export async function addComment(
    buildId: string,
    authorEmail: string,
    content: string
): Promise<BuildComment> {
    const response = await fetch(`${API_BASE}/${buildId}/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorEmail, content }),
    })
    if (!response.ok) {
        const data = await response.json().catch(() => null)
        if (response.status === 403 && data?.error) {
            throw new SanctionError(data.error, data.reason)
        }
        throw new Error(data?.error || "Failed to add comment")
    }
    return response.json()
}

/**
 * Update a comment
 */
export async function updateComment(
    commentId: string,
    authorEmail: string,
    content: string
): Promise<BuildComment> {
    const response = await fetch(`${API_BASE}/comments/${commentId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorEmail, content }),
    })
    if (!response.ok) {
        throw new Error("Failed to update comment")
    }
    return response.json()
}

/**
 * Delete a comment
 */
export async function deleteComment(
    commentId: string,
    userEmail: string
): Promise<void> {
    const response = await fetch(
        `${API_BASE}/comments/${commentId}/?userEmail=${encodeURIComponent(userEmail)}`,
        { method: "DELETE" }
    )
    if (!response.ok) {
        throw new Error("Failed to delete comment")
    }
}

// ==================== Image Upload ====================

interface UploadImageResponse {
    success: boolean
    url?: string
    error?: string
}

/**
 * Upload a build image to Supabase Storage
 * @param imageData - Base64-encoded image data (with data URL prefix)
 * @param authorEmail - Email of the build author
 * @returns Object with success status and either URL or error message
 */
export async function uploadBuildImage(
    imageData: string,
    authorEmail: string
): Promise<UploadImageResponse> {
    const response = await fetch(`${API_BASE}/upload-image/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, authorEmail }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        return {
            success: false,
            error: data.error || "Failed to upload image",
        }
    }
    
    return data
}
