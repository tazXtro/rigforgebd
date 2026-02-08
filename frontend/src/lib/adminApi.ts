/**
 * Admin API utility functions.
 *
 * Provides functions to interact with the rigadmin backend API.
 * All authenticated endpoints require a Clerk JWT token.
 *
 * @module adminApi
 */

import { createAuthFetch, parseApiResponse, type GetToken, type ApiResult } from "./authFetch";

const API_BASE = "http://localhost:8000/api/admin";

export interface AdminProfile {
    id: string;
    user_id: string;
    created_at: string;
    users?: {
        id: string;
        email: string;
        display_name: string;
        avatar_url: string;
    };
}

export interface Invite {
    id: string;
    token: string;
    email: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
}

export interface ApiError {
    error: string;
}

/**
 * Create admin API functions with authentication.
 *
 * @param getToken - Function from Clerk's useAuth that retrieves the JWT token
 * @returns Object containing all admin API functions
 */
export function createAdminApi(getToken: GetToken) {
    const authFetch = createAuthFetch(getToken);

    return {
        /**
         * Check if the authenticated user is an admin.
         * Uses the JWT token to verify admin status.
         */
        async checkAdminStatus(): Promise<boolean> {
            try {
                const response = await authFetch("/check/", {
                    method: "POST",
                });

                if (!response.ok) {
                    return false;
                }

                const data = await response.json();
                return data.is_admin === true;
            } catch (error) {
                console.error("[adminApi] Error checking admin status:", error);
                return false;
            }
        },

        /**
         * Get current admin profile using JWT-verified email.
         */
        async getAdminProfile(): Promise<AdminProfile | null> {
            try {
                const response = await authFetch("/me/");

                if (!response.ok) {
                    return null;
                }

                return await response.json();
            } catch (error) {
                console.error("[adminApi] Error fetching admin profile:", error);
                return null;
            }
        },

        /**
         * Create a new admin invite for a specific email.
         */
        async createInvite(
            targetEmail: string,
            expiresHours: number = 72
        ): Promise<{ invite?: Invite; error?: string }> {
            try {
                const response = await authFetch("/invites/", {
                    method: "POST",
                    body: JSON.stringify({
                        email: targetEmail,
                        expires_hours: expiresHours,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    return { error: data.error || "Failed to create invite" };
                }

                return { invite: data };
            } catch (error) {
                console.error("[adminApi] Error creating invite:", error);
                return { error: "Network error" };
            }
        },

        /**
         * Get pending invites created by the authenticated admin.
         */
        async getPendingInvites(): Promise<Invite[]> {
            try {
                const response = await authFetch("/invites/");

                if (!response.ok) {
                    return [];
                }

                const data = await response.json();
                return data.invites || [];
            } catch (error) {
                console.error("[adminApi] Error fetching pending invites:", error);
                return [];
            }
        },
    };
}

/**
 * Validate an invite token.
 * This does NOT require authentication.
 */
export async function validateInvite(
    token: string
): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/invites/validate/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });

        return await response.json();
    } catch (error) {
        console.error("[adminApi] Error validating invite:", error);
        return { valid: false, error: "Network error" };
    }
}

/**
 * Accept an invite and become an admin.
 * This does NOT require authentication (user isn't admin yet).
 */
export async function acceptInvite(
    token: string,
    email: string
): Promise<{ success?: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/invites/accept/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, email }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || "Failed to accept invite" };
        }

        return { success: true };
    } catch (error) {
        console.error("[adminApi] Error accepting invite:", error);
        return { error: "Network error" };
    }
}

/**
 * Generate the full invite URL for sharing.
 */
export function getInviteUrl(token: string): string {
    const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return `${baseUrl}/invite/${token}`;
}

// ============================================================
// Legacy functions (deprecated - use createAdminApi instead)
// These are kept for backwards compatibility during migration
// ============================================================

/**
 * @deprecated Use createAdminApi(getToken).checkAdminStatus() instead
 */
export async function checkAdminStatus(email: string): Promise<boolean> {
    console.warn(
        "[adminApi] checkAdminStatus(email) is deprecated. Use createAdminApi(getToken).checkAdminStatus() instead."
    );
    try {
        const response = await fetch(`${API_BASE}/check/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.is_admin === true;
    } catch (error) {
        console.error("[adminApi] Error checking admin status:", error);
        return false;
    }
}

/**
 * @deprecated Use createAdminApi(getToken).getAdminProfile() instead
 */
export async function getAdminProfile(email: string): Promise<AdminProfile | null> {
    console.warn(
        "[adminApi] getAdminProfile(email) is deprecated. Use createAdminApi(getToken).getAdminProfile() instead."
    );
    try {
        const response = await fetch(`${API_BASE}/me/?email=${encodeURIComponent(email)}`);

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("[adminApi] Error fetching admin profile:", error);
        return null;
    }
}

/**
 * @deprecated Use createAdminApi(getToken).createInvite(targetEmail) instead
 */
export async function createInvite(
    adminEmail: string,
    targetEmail: string,
    expiresHours: number = 72
): Promise<{ invite?: Invite; error?: string }> {
    console.warn(
        "[adminApi] createInvite(adminEmail, ...) is deprecated. Use createAdminApi(getToken).createInvite(targetEmail) instead."
    );
    try {
        const response = await fetch(
            `${API_BASE}/invites/?admin_email=${encodeURIComponent(adminEmail)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: targetEmail,
                    expires_hours: expiresHours,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || "Failed to create invite" };
        }

        return { invite: data };
    } catch (error) {
        console.error("[adminApi] Error creating invite:", error);
        return { error: "Network error" };
    }
}

/**
 * @deprecated Use createAdminApi(getToken).getPendingInvites() instead
 */
export async function getPendingInvites(email: string): Promise<Invite[]> {
    console.warn(
        "[adminApi] getPendingInvites(email) is deprecated. Use createAdminApi(getToken).getPendingInvites() instead."
    );
    try {
        const response = await fetch(`${API_BASE}/invites/?email=${encodeURIComponent(email)}`);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.invites || [];
    } catch (error) {
        console.error("[adminApi] Error fetching pending invites:", error);
        return [];
    }
}
