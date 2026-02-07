/**
 * Admin product management API functions.
 *
 * Handles product creation, updates (fields, specs, prices), and deletion.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================== Types ====================

export interface AdminProductCreatePayload {
    admin_email: string;
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

export interface AdminProductUpdatePayload {
    admin_email: string;
    name?: string;
    brand?: string;
    image_url?: string;
    category?: string;
}

export interface AdminSpecsUpdatePayload {
    admin_email: string;
    specs: Record<string, string>;
}

export interface AdminPriceCreatePayload {
    admin_email: string;
    retailer_id: string;
    price: number;
    product_url: string;
    in_stock?: boolean;
}

export interface AdminPriceUpdatePayload {
    admin_email: string;
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

// ==================== API Functions ====================

export async function adminCreateProduct(
    payload: AdminProductCreatePayload
): Promise<{ product?: AdminProduct; error?: string }> {
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

export async function adminUpdateProduct(
    productId: string,
    payload: AdminProductUpdatePayload
): Promise<{ product?: AdminProduct; error?: string }> {
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

export async function adminUpdateSpecs(
    productId: string,
    payload: AdminSpecsUpdatePayload
): Promise<{ success?: boolean; specs?: Record<string, string>; error?: string }> {
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

export async function adminAddPrice(
    productId: string,
    payload: AdminPriceCreatePayload
): Promise<{ price?: Record<string, unknown>; error?: string }> {
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

export async function adminUpdatePrice(
    productId: string,
    priceId: string,
    payload: AdminPriceUpdatePayload
): Promise<{ price?: Record<string, unknown>; error?: string }> {
    try {
        const response = await fetch(
            `${API_BASE}/admin/products/${productId}/prices/${priceId}/`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
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
}

export async function adminDeleteProduct(
    productId: string,
    adminEmail: string
): Promise<{ success?: boolean; error?: string }> {
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
