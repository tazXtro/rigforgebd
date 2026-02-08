/**
 * Moderation API functions for admin panel.
 *
 * Handles build approvals and user sanctions.
 * All authenticated endpoints require a Clerk JWT token.
 *
 * @module moderationApi
 */

import { createAuthFetch, type GetToken } from "./authFetch";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================== Types ====================

export interface BuildComponent {
    id: string;
    category: string;
    product: {
        id: string;
        name: string;
        brand: string;
        image: string;
        category: string;
        specifications: Record<string, string>;
        minPrice: number;
        basePrice: number;
        prices: { shop: string; price: number; availability: string; url?: string }[];
    } | null;
    quantity: number;
    isSelected: boolean;
    selectedRetailer?: string;
}

export interface PendingBuild {
    id: string;
    title: string;
    description: string;
    image_url: string;
    total_price: number;
    created_at: string;
    approval_status: "pending" | "approved" | "rejected";
    rejection_reason: string | null;
    components: BuildComponent[];
    users: {
        id: string;
        email: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
    };
}

export interface PendingBuildsResponse {
    builds: PendingBuild[];
    total: number;
    page: number;
    pageSize: number;
}

export interface Sanction {
    id: string;
    user_id: string;
    sanction_type: "timeout" | "permanent_ban";
    reason: string | null;
    duration_days: number | null;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
    users: {
        id: string;
        email: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
    };
}

export interface SanctionsResponse {
    sanctions: Sanction[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ModerationComment {
    id: string;
    content: string;
    created_at: string;
    users: {
        id: string;
        email: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
    };
    builds: {
        id: string;
        title: string;
    };
}

export interface CommentsResponse {
    comments: ModerationComment[];
    total: number;
    page: number;
    pageSize: number;
}

export interface UserSanctionStatus {
    sanctioned: boolean;
    sanction_type?: string;
    reason?: string;
    expires_at?: string;
}

// ==================== Authenticated API Factory ====================

/**
 * Create moderation API functions with JWT authentication.
 *
 * @param getToken - Function from Clerk's useAuth that retrieves the JWT token
 * @returns Object containing all moderation API functions
 */
export function createModerationApi(getToken: GetToken) {
    const authFetch = createAuthFetch(getToken);

    return {
        // ==================== Build Approval ====================

        async getPendingBuilds(
            page: number = 1,
            pageSize: number = 12
        ): Promise<PendingBuildsResponse> {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
            });

            const response = await authFetch(`${API_BASE}/admin/builds/pending/?${params}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch pending builds");
            }

            return response.json();
        },

        async getPendingBuildsCount(): Promise<number> {
            const response = await authFetch(`${API_BASE}/admin/builds/pending/count/`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch pending count");
            }

            const data = await response.json();
            return data.count;
        },

        async approveBuild(buildId: string): Promise<{ success: boolean; message: string }> {
            const response = await authFetch(`${API_BASE}/admin/builds/${buildId}/approve/`, {
                method: "POST",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to approve build");
            }

            return response.json();
        },

        async rejectBuild(
            buildId: string,
            reason?: string
        ): Promise<{ success: boolean; message: string }> {
            const response = await authFetch(`${API_BASE}/admin/builds/${buildId}/reject/`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to reject build");
            }

            return response.json();
        },

        // ==================== User Moderation ====================

        async getAllComments(
            page: number = 1,
            pageSize: number = 20,
            search?: string
        ): Promise<CommentsResponse> {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
            });

            if (search) {
                params.set("search", search);
            }

            const response = await authFetch(`${API_BASE}/admin/comments/?${params}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch comments");
            }

            return response.json();
        },

        async getActiveSanctions(
            page: number = 1,
            pageSize: number = 20
        ): Promise<SanctionsResponse> {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
            });

            const response = await authFetch(`${API_BASE}/admin/sanctions/?${params}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch sanctions");
            }

            return response.json();
        },

        async createSanction(
            userId: string,
            sanctionType: "timeout" | "permanent_ban",
            reason?: string,
            durationDays?: number
        ): Promise<Sanction> {
            const response = await authFetch(`${API_BASE}/admin/sanctions/`, {
                method: "POST",
                body: JSON.stringify({
                    user_id: userId,
                    sanction_type: sanctionType,
                    reason,
                    duration_days: durationDays,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create sanction");
            }

            return response.json();
        },

        async removeSanction(sanctionId: string): Promise<{ success: boolean; message: string }> {
            const response = await authFetch(`${API_BASE}/admin/sanctions/${sanctionId}/`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to remove sanction");
            }

            return response.json();
        },
    };
}

// ==================== Public Endpoints (No Auth Required) ====================

/**
 * Check if a user is sanctioned.
 * This does NOT require authentication.
 */
export async function checkUserSanction(userId: string): Promise<UserSanctionStatus> {
    const response = await fetch(`${API_BASE}/admin/sanctions/check/${userId}/`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check user sanction");
    }

    return response.json();
}

// ============================================================
// Legacy functions (deprecated - use createModerationApi instead)
// ============================================================

/**
 * @deprecated Use createModerationApi(getToken).getPendingBuilds(page, pageSize) instead
 */
export async function getPendingBuilds(
    adminEmail: string,
    page: number = 1,
    pageSize: number = 12
): Promise<PendingBuildsResponse> {
    console.warn(
        "[moderationApi] getPendingBuilds(adminEmail, ...) is deprecated. Use createModerationApi(getToken).getPendingBuilds(page, pageSize) instead."
    );
    const params = new URLSearchParams({
        email: adminEmail,
        page: page.toString(),
        pageSize: pageSize.toString(),
    });

    const response = await fetch(`${API_BASE}/admin/builds/pending/?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch pending builds");
    }

    return response.json();
}

/**
 * @deprecated Use createModerationApi(getToken).getPendingBuildsCount() instead
 */
export async function getPendingBuildsCount(adminEmail: string): Promise<number> {
    console.warn(
        "[moderationApi] getPendingBuildsCount(adminEmail) is deprecated. Use createModerationApi(getToken).getPendingBuildsCount() instead."
    );
    const params = new URLSearchParams({ email: adminEmail });

    const response = await fetch(`${API_BASE}/admin/builds/pending/count/?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch pending count");
    }

    const data = await response.json();
    return data.count;
}

/**
 * @deprecated Use createModerationApi(getToken).approveBuild(buildId) instead
 */
export async function approveBuild(
    buildId: string,
    adminEmail: string
): Promise<{ success: boolean; message: string }> {
    console.warn(
        "[moderationApi] approveBuild(buildId, adminEmail) is deprecated. Use createModerationApi(getToken).approveBuild(buildId) instead."
    );
    const response = await fetch(`${API_BASE}/admin/builds/${buildId}/approve/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_email: adminEmail }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve build");
    }

    return response.json();
}

/**
 * @deprecated Use createModerationApi(getToken).rejectBuild(buildId, reason) instead
 */
export async function rejectBuild(
    buildId: string,
    adminEmail: string,
    reason?: string
): Promise<{ success: boolean; message: string }> {
    console.warn(
        "[moderationApi] rejectBuild(buildId, adminEmail, reason) is deprecated. Use createModerationApi(getToken).rejectBuild(buildId, reason) instead."
    );
    const response = await fetch(`${API_BASE}/admin/builds/${buildId}/reject/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_email: adminEmail, reason }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject build");
    }

    return response.json();
}

/**
 * @deprecated Use createModerationApi(getToken).getAllComments(page, pageSize, search) instead
 */
export async function getAllComments(
    adminEmail: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string
): Promise<CommentsResponse> {
    console.warn(
        "[moderationApi] getAllComments(adminEmail, ...) is deprecated. Use createModerationApi(getToken).getAllComments(page, pageSize, search) instead."
    );
    const params = new URLSearchParams({
        email: adminEmail,
        page: page.toString(),
        pageSize: pageSize.toString(),
    });

    if (search) {
        params.set("search", search);
    }

    const response = await fetch(`${API_BASE}/admin/comments/?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch comments");
    }

    return response.json();
}

/**
 * @deprecated Use createModerationApi(getToken).getActiveSanctions(page, pageSize) instead
 */
export async function getActiveSanctions(
    adminEmail: string,
    page: number = 1,
    pageSize: number = 20
): Promise<SanctionsResponse> {
    console.warn(
        "[moderationApi] getActiveSanctions(adminEmail, ...) is deprecated. Use createModerationApi(getToken).getActiveSanctions(page, pageSize) instead."
    );
    const params = new URLSearchParams({
        email: adminEmail,
        page: page.toString(),
        pageSize: pageSize.toString(),
    });

    const response = await fetch(`${API_BASE}/admin/sanctions/?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch sanctions");
    }

    return response.json();
}

/**
 * @deprecated Use createModerationApi(getToken).createSanction(userId, sanctionType, reason, durationDays) instead
 */
export async function createSanction(
    adminEmail: string,
    userId: string,
    sanctionType: "timeout" | "permanent_ban",
    reason?: string,
    durationDays?: number
): Promise<Sanction> {
    console.warn(
        "[moderationApi] createSanction(adminEmail, ...) is deprecated. Use createModerationApi(getToken).createSanction(userId, sanctionType, reason, durationDays) instead."
    );
    const response = await fetch(`${API_BASE}/admin/sanctions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            admin_email: adminEmail,
            user_id: userId,
            sanction_type: sanctionType,
            reason,
            duration_days: durationDays,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create sanction");
    }

    return response.json();
}

/**
 * @deprecated Use createModerationApi(getToken).removeSanction(sanctionId) instead
 */
export async function removeSanction(
    sanctionId: string,
    adminEmail: string
): Promise<{ success: boolean; message: string }> {
    console.warn(
        "[moderationApi] removeSanction(sanctionId, adminEmail) is deprecated. Use createModerationApi(getToken).removeSanction(sanctionId) instead."
    );
    const params = new URLSearchParams({ email: adminEmail });

    const response = await fetch(`${API_BASE}/admin/sanctions/${sanctionId}/?${params}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove sanction");
    }

    return response.json();
}
