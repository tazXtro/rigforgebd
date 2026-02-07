/**
 * Admin compatibility management API functions.
 *
 * Handles fetching products with missing compatibility fields
 * and updating them via admin manual input.
 */

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
    admin_email: string;
    cpu_socket?: string | null;
    mobo_socket?: string | null;
    memory_type?: string | null;
    memory_max_speed_mhz?: number | null;
}

// ==================== API Functions ====================

/**
 * Get counts of products with missing compatibility fields.
 */
export async function getMissingCompatCounts(
    adminEmail: string
): Promise<{ counts?: MissingCompatCounts; error?: string }> {
    try {
        const response = await fetch(
            `${API_BASE}/admin/compat/missing/count/?admin_email=${encodeURIComponent(adminEmail)}`
        );
        const data = await response.json();
        if (!response.ok)
            return { error: data.error || "Failed to fetch counts" };
        return { counts: data };
    } catch (error) {
        console.error("[adminCompatApi] Counts error:", error);
        return { error: "Network error" };
    }
}

/**
 * Get paginated list of products with missing compat fields.
 */
export async function getMissingCompatRecords(
    adminEmail: string,
    componentType: string = "all",
    page: number = 1,
    pageSize: number = 20
): Promise<{ data?: MissingCompatResponse; error?: string }> {
    try {
        const params = new URLSearchParams({
            admin_email: adminEmail,
            component_type: componentType,
            page: String(page),
            page_size: String(pageSize),
        });
        const response = await fetch(
            `${API_BASE}/admin/compat/missing/?${params.toString()}`
        );
        const data = await response.json();
        if (!response.ok)
            return { error: data.error || "Failed to fetch records" };
        return { data };
    } catch (error) {
        console.error("[adminCompatApi] List error:", error);
        return { error: "Network error" };
    }
}

/**
 * Update compatibility fields for a product.
 */
export async function updateCompatFields(
    productId: string,
    payload: CompatUpdatePayload
): Promise<{ success?: boolean; error?: string }> {
    try {
        const response = await fetch(
            `${API_BASE}/admin/compat/${productId}/`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }
        );
        const data = await response.json();
        if (!response.ok)
            return { error: data.error || "Failed to update" };
        return { success: true };
    } catch (error) {
        console.error("[adminCompatApi] Update error:", error);
        return { error: "Network error" };
    }
}
