import { Build, BuildFormData, BuildComment, BuildsFilter, BuildsResponse } from "@/components/builds/types"

// For testing phase: store data in Desktop folder
// In production, this would call actual backend API

const API_BASE = "/api/builds"

export async function getBuilds(filter?: BuildsFilter, page = 1, pageSize = 12): Promise<BuildsResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
    })

    if (filter?.sortBy) params.append("sortBy", filter.sortBy)
    if (filter?.featured !== undefined) params.append("featured", filter.featured.toString())
    if (filter?.search) params.append("search", filter.search)

    const response = await fetch(`${API_BASE}?${params.toString()}`)
    if (!response.ok) {
        throw new Error("Failed to fetch builds")
    }
    return response.json()
}

export async function getBuildById(id: string): Promise<Build | null> {
    const response = await fetch(`${API_BASE}/${id}`)
    if (!response.ok) {
        if (response.status === 404) return null
        throw new Error("Failed to fetch build")
    }
    return response.json()
}

export async function getFeaturedBuilds(): Promise<Build[]> {
    const response = await fetch(`${API_BASE}/featured`)
    if (!response.ok) {
        throw new Error("Failed to fetch featured builds")
    }
    return response.json()
}

export async function createBuild(data: BuildFormData, author: { id: string; username: string; avatarUrl?: string }): Promise<Build> {
    const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, author }),
    })
    if (!response.ok) {
        throw new Error("Failed to create build")
    }
    return response.json()
}

export async function updateBuild(id: string, data: Partial<BuildFormData>): Promise<Build> {
    const response = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        throw new Error("Failed to update build")
    }
    return response.json()
}

export async function deleteBuild(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
    })
    if (!response.ok) {
        throw new Error("Failed to delete build")
    }
}

// Voting
export async function voteBuild(buildId: string, userId: string, voteType: "upvote" | "downvote"): Promise<Build> {
    const response = await fetch(`${API_BASE}/${buildId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, voteType }),
    })
    if (!response.ok) {
        throw new Error("Failed to vote on build")
    }
    return response.json()
}

export async function removeVote(buildId: string, userId: string): Promise<Build> {
    const response = await fetch(`${API_BASE}/${buildId}/vote`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
    })
    if (!response.ok) {
        throw new Error("Failed to remove vote")
    }
    return response.json()
}

// Comments
export async function getComments(buildId: string): Promise<BuildComment[]> {
    const response = await fetch(`${API_BASE}/${buildId}/comments`)
    if (!response.ok) {
        throw new Error("Failed to fetch comments")
    }
    return response.json()
}

export async function addComment(
    buildId: string,
    author: { id: string; username: string; avatarUrl?: string },
    content: string
): Promise<BuildComment> {
    const response = await fetch(`${API_BASE}/${buildId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, content }),
    })
    if (!response.ok) {
        throw new Error("Failed to add comment")
    }
    return response.json()
}

export async function deleteComment(buildId: string, commentId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${buildId}/comments/${commentId}`, {
        method: "DELETE",
    })
    if (!response.ok) {
        throw new Error("Failed to delete comment")
    }
}

// Feature/unfeature (admin)
export async function toggleFeatured(buildId: string, featured: boolean): Promise<Build> {
    const response = await fetch(`${API_BASE}/${buildId}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured }),
    })
    if (!response.ok) {
        throw new Error("Failed to toggle featured status")
    }
    return response.json()
}
