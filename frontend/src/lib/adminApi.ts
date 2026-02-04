/**
 * Admin API utility functions.
 * 
 * Provides functions to interact with the rigadmin backend API.
 */

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
 * Check if a user is an admin by email.
 */
export async function checkAdminStatus(email: string): Promise<boolean> {
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
 * Get admin profile by email.
 */
export async function getAdminProfile(email: string): Promise<AdminProfile | null> {
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
 * Create a new admin invite for a specific email.
 */
export async function createInvite(
    adminEmail: string,
    targetEmail: string,
    expiresHours: number = 72
): Promise<{ invite?: Invite; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/invites/?admin_email=${encodeURIComponent(adminEmail)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
}

/**
 * Validate an invite token.
 */
export async function validateInvite(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
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
 * Get pending invites created by an admin.
 */
export async function getPendingInvites(email: string): Promise<Invite[]> {
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

/**
 * Generate the full invite URL for sharing.
 */
export function getInviteUrl(token: string): string {
    // Use window.location.origin in browser, fallback for SSR
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return `${baseUrl}/invite/${token}`;
}
