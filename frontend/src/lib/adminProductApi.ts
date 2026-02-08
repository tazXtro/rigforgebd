/**
 * Admin product management API functions.
 *
 * Handles product creation, updates (fields, specs, prices), and deletion.
 * All authenticated endpoints require a Clerk JWT token.
 *
 * @module adminProductApi
 */

import { createAuthFetch, type GetToken } from "./authFetch";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================== Types ====================

export interface ProductCreatePayload {
    name: string;
    category: string;
    brand?: string;
    image_url?: string;
    specs?: Record<string, string>;
    retailer_id: string;
    price: number;
    product_url: string;
    in_stock?: boolean;
}

export interface ProductUpdatePayload {
    name?: string;
    brand?: string;
    image_url?: string;
    category?: string;
}

export interface SpecsUpdatePayload {
    specs: Record<string, string>;
}

export interface PriceCreatePayload {
    retailer_id: string;
    price: number;
    product_url: string;
    in_stock?: boolean;
}

export interface PriceUpdatePayload {
    price?: number;
    in_stock?: boolean;
    product_url?: string;
}

export interface AdminProduct {
    id: string;
    name: string;
    slug: string;
    category: string;
    category_slug: string;
    brand: string | null;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    added_to_existing?: boolean;
}

// ==================== Authenticated API Factory ====================

/** Type for the JWT-authenticated product API instance */
export type ProductApi = ReturnType<typeof createProductApi>;

/**
 * Create product API functions with JWT authentication.
 *
 * @param getToken - Function from Clerk's useAuth that retrieves the JWT token
 * @returns Object containing all product management API functions
 */
export function createProductApi(getToken: GetToken) {
    const authFetch = createAuthFetch(getToken);

    return {
        async createProduct(
            payload: ProductCreatePayload
        ): Promise<{ product?: AdminProduct; error?: string }> {
            try {
                const response = await authFetch(`${API_BASE}/admin/products/`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to create product" };
                return { product: data };
            } catch (error) {
                console.error("[adminProductApi] Create error:", error);
                return { error: "Network error" };
            }
        },

        async updateProduct(
            productId: string,
            payload: ProductUpdatePayload
        ): Promise<{ product?: AdminProduct; error?: string }> {
            try {
                const response = await authFetch(`${API_BASE}/admin/products/${productId}/`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to update product" };
                return { product: data };
            } catch (error) {
                console.error("[adminProductApi] Update error:", error);
                return { error: "Network error" };
            }
        },

        async updateSpecs(
            productId: string,
            payload: SpecsUpdatePayload
        ): Promise<{ success?: boolean; specs?: Record<string, string>; error?: string }> {
            try {
                const response = await authFetch(`${API_BASE}/admin/products/${productId}/specs/`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to update specs" };
                return { success: true, specs: data.specs };
            } catch (error) {
                console.error("[adminProductApi] Specs update error:", error);
                return { error: "Network error" };
            }
        },

        async addPrice(
            productId: string,
            payload: PriceCreatePayload
        ): Promise<{ price?: Record<string, unknown>; error?: string }> {
            try {
                const response = await authFetch(`${API_BASE}/admin/products/${productId}/prices/`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to add price" };
                return { price: data };
            } catch (error) {
                console.error("[adminProductApi] Add price error:", error);
                return { error: "Network error" };
            }
        },

        async updatePrice(
            productId: string,
            priceId: string,
            payload: PriceUpdatePayload
        ): Promise<{ price?: Record<string, unknown>; error?: string }> {
            try {
                const response = await authFetch(
                    `${API_BASE}/admin/products/${productId}/prices/${priceId}/`,
                    {
                        method: "PATCH",
                        body: JSON.stringify(payload),
                    }
                );
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to update price" };
                return { price: data };
            } catch (error) {
                console.error("[adminProductApi] Price update error:", error);
                return { error: "Network error" };
            }
        },

        async deleteProduct(productId: string): Promise<{ success?: boolean; error?: string }> {
            try {
                const response = await authFetch(`${API_BASE}/admin/products/${productId}/`, {
                    method: "DELETE",
                });
                const data = await response.json();
                if (!response.ok) return { error: data.error || "Failed to delete product" };
                return { success: true };
            } catch (error) {
                console.error("[adminProductApi] Delete error:", error);
                return { error: "Network error" };
            }
        },
    };
}

// ============================================================
// Legacy types (deprecated - remove admin_email from payloads)
// ============================================================

export interface AdminProductCreatePayload extends ProductCreatePayload {
    admin_email: string;
}

export interface AdminProductUpdatePayload extends ProductUpdatePayload {
    admin_email: string;
}

export interface AdminSpecsUpdatePayload extends SpecsUpdatePayload {
    admin_email: string;
}

export interface AdminPriceCreatePayload extends PriceCreatePayload {
    admin_email: string;
}

export interface AdminPriceUpdatePayload extends PriceUpdatePayload {
    admin_email: string;
}

// ============================================================
// Legacy functions (deprecated - use createProductApi instead)
// ============================================================

/** @deprecated Use createProductApi(getToken).createProduct(payload) instead */
export async function adminCreateProduct(
    payload: AdminProductCreatePayload
): Promise<{ product?: AdminProduct; error?: string }> {
    console.warn(
        "[adminProductApi] adminCreateProduct is deprecated. Use createProductApi(getToken).createProduct(payload) instead."
    );
    try {
        const response = await fetch(`${API_BASE}/admin/products/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to create product" };
        return { product: data };
    } catch (error) {
        console.error("[adminProductApi] Create error:", error);
        return { error: "Network error" };
    }
}

/** @deprecated Use createProductApi(getToken).updateProduct(productId, payload) instead */
export async function adminUpdateProduct(
    productId: string,
    payload: AdminProductUpdatePayload
): Promise<{ product?: AdminProduct; error?: string }> {
    console.warn(
        "[adminProductApi] adminUpdateProduct is deprecated. Use createProductApi(getToken).updateProduct(productId, payload) instead."
    );
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to update product" };
        return { product: data };
    } catch (error) {
        console.error("[adminProductApi] Update error:", error);
        return { error: "Network error" };
    }
}

/** @deprecated Use createProductApi(getToken).updateSpecs(productId, payload) instead */
export async function adminUpdateSpecs(
    productId: string,
    payload: AdminSpecsUpdatePayload
): Promise<{ success?: boolean; specs?: Record<string, string>; error?: string }> {
    console.warn(
        "[adminProductApi] adminUpdateSpecs is deprecated. Use createProductApi(getToken).updateSpecs(productId, payload) instead."
    );
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}/specs/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to update specs" };
        return { success: true, specs: data.specs };
    } catch (error) {
        console.error("[adminProductApi] Specs update error:", error);
        return { error: "Network error" };
    }
}

/** @deprecated Use createProductApi(getToken).addPrice(productId, payload) instead */
export async function adminAddPrice(
    productId: string,
    payload: AdminPriceCreatePayload
): Promise<{ price?: Record<string, unknown>; error?: string }> {
    console.warn(
        "[adminProductApi] adminAddPrice is deprecated. Use createProductApi(getToken).addPrice(productId, payload) instead."
    );
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}/prices/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to add price" };
        return { price: data };
    } catch (error) {
        console.error("[adminProductApi] Add price error:", error);
        return { error: "Network error" };
    }
}

/** @deprecated Use createProductApi(getToken).updatePrice(productId, priceId, payload) instead */
export async function adminUpdatePrice(
    productId: string,
    priceId: string,
    payload: AdminPriceUpdatePayload
): Promise<{ price?: Record<string, unknown>; error?: string }> {
    console.warn(
        "[adminProductApi] adminUpdatePrice is deprecated. Use createProductApi(getToken).updatePrice(productId, priceId, payload) instead."
    );
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}/prices/${priceId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to update price" };
        return { price: data };
    } catch (error) {
        console.error("[adminProductApi] Price update error:", error);
        return { error: "Network error" };
    }
}

/** @deprecated Use createProductApi(getToken).deleteProduct(productId) instead */
export async function adminDeleteProduct(
    productId: string,
    adminEmail: string
): Promise<{ success?: boolean; error?: string }> {
    console.warn(
        "[adminProductApi] adminDeleteProduct is deprecated. Use createProductApi(getToken).deleteProduct(productId) instead."
    );
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}/`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_email: adminEmail }),
        });
        const data = await response.json();
        if (!response.ok) return { error: data.error || "Failed to delete product" };
        return { success: true };
    } catch (error) {
        console.error("[adminProductApi] Delete error:", error);
        return { error: "Network error" };
    }
}
