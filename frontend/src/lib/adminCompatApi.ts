/**
 * Admin compatibility management API functions.
 *
 * Handles fetching products with missing compatibility fields
 * and updating them via admin manual input.
 * All authenticated endpoints require a Clerk JWT token.
 *
 * @module adminCompatApi
 */

import { createAuthFetch, type GetToken } from "./authFetch";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================== Types ====================

export interface MissingCompatRecord {
    id: string;
    product_id: string;
    component_type: "cpu" | "motherboard" | "ram";
    product_name: string | null;
    product_brand: string | null;
    product_category: string | null;
    product_image_url: string | null;
    cpu_socket: string | null;
    mobo_socket: string | null;
    memory_type: string | null;
    memory_max_speed_mhz: number | null;
    confidence: number;
    extraction_source: string | null;
    missing_fields: string[];
}

export interface MissingCompatCounts {
    cpu: number;
    motherboard: number;
    ram: number;
    total: number;
}

export interface MissingCompatResponse {
    records: MissingCompatRecord[];
    total: number;
    page: number;
    page_size: number;
}

export interface CompatUpdatePayload {
    cpu_socket?: string | null;
    mobo_socket?: string | null;
    memory_type?: string | null;
    memory_max_speed_mhz?: number | null;
}

// ==================== Authenticated API Factory ====================

/**
 * Create compat API functions with JWT authentication.
 *
 * @param getToken - Function from Clerk's useAuth that retrieves the JWT token
 * @returns Object containing all compat API functions
 */
export function createCompatApi(getToken: GetToken) {
    const authFetch = createAuthFetch(getToken);

    return {
        /**
         * Get counts of products with missing compatibility fields.
         */
        async getMissingCompatCounts(): Promise<{
            counts?: MissingCompatCounts;
            error?: string;
        }> {
            try {
                const response = await authFetch(`${API_BASE}/admin/compat/missing/count/`);
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to fetch counts" };
                return { counts: data };
            } catch (error) {
                console.error("[adminCompatApi] Counts error:", error);
                return { error: "Network error" };
            }
        },

        /**
         * Get paginated list of products with missing compat fields.
         */
        async getMissingCompatRecords(
            componentType: string = "all",
            page: number = 1,
            pageSize: number = 20
        ): Promise<{ data?: MissingCompatResponse; error?: string }> {
            try {
                const params = new URLSearchParams({
                    component_type: componentType,
                    page: String(page),
                    page_size: String(pageSize),
                });
                const response = await authFetch(`${API_BASE}/admin/compat/missing/?${params}`);
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to fetch records" };
                return { data };
            } catch (error) {
                console.error("[adminCompatApi] List error:", error);
                return { error: "Network error" };
            }
        },

        /**
         * Update compatibility fields for a product.
         */
        async updateCompatFields(
            productId: string,
            payload: CompatUpdatePayload
        ): Promise<{ success?: boolean; error?: string }> {
            try {
                const response = await authFetch(`${API_BASE}/admin/compat/${productId}/`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to update" };
                return { success: true };
            } catch (error) {
                console.error("[adminCompatApi] Update error:", error);
                return { error: "Network error" };
            }
        },
    };
}

// ============================================================
// Legacy functions (deprecated - use createCompatApi instead)
// ============================================================

/** @deprecated Use createCompatApi(getToken).getMissingCompatCounts() instead */
export async function getMissingCompatCounts(
    adminEmail: string
): Promise<{ counts?: MissingCompatCounts; error?: string }> {
    console.warn(
        "[adminCompatApi] getMissingCompatCounts(adminEmail) is deprecated. Use createCompatApi(getToken).getMissingCompatCounts() instead."
    );
    try {
        const response = await fetch(
            `${API_BASE}/admin/compat/missing/count/?admin_email=${encodeURIComponent(adminEmail)}`
        );
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to fetch counts" };
        return { counts: data };
    } catch (error) {
        console.error("[adminCompatApi] Counts error:", error);
        return { error: "Network error" };
    }
}

/** @deprecated Use createCompatApi(getToken).getMissingCompatRecords(componentType, page, pageSize) instead */
export async function getMissingCompatRecords(
    adminEmail: string,
    componentType: string = "all",
    page: number = 1,
    pageSize: number = 20
): Promise<{ data?: MissingCompatResponse; error?: string }> {
    console.warn(
        "[adminCompatApi] getMissingCompatRecords(adminEmail, ...) is deprecated. Use createCompatApi(getToken).getMissingCompatRecords(componentType, page, pageSize) instead."
    );
    try {
        const params = new URLSearchParams({
            admin_email: adminEmail,
            component_type: componentType,
            page: String(page),
            page_size: String(pageSize),
        });
        const response = await fetch(`${API_BASE}/admin/compat/missing/?${params}`);
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to fetch records" };
        return { data };
    } catch (error) {
        console.error("[adminCompatApi] List error:", error);
        return { error: "Network error" };
    }
}

/** @deprecated Use createCompatApi(getToken).updateCompatFields(productId, payload) instead */
export async function updateCompatFields(
    productId: string,
    payload: CompatUpdatePayload & { admin_email: string }
): Promise<{ success?: boolean; error?: string }> {
    console.warn(
        "[adminCompatApi] updateCompatFields(productId, {admin_email, ...}) is deprecated. Use createCompatApi(getToken).updateCompatFields(productId, payload) instead."
    );
    try {
        const response = await fetch(`${API_BASE}/admin/compat/${productId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to update" };
        return { success: true };
    } catch (error) {
        console.error("[adminCompatApi] Update error:", error);
        return { error: "Network error" };
    }
}
