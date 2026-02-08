/**
 * Authenticated fetch utility for admin API calls.
 *
 * Provides a centralized way to make authenticated requests with Clerk JWT tokens.
 * Handles token retrieval, loading states, and error handling.
 *
 * @module authFetch
 */

const API_BASE = "http://localhost:8000/api/admin";

export interface AuthFetchOptions extends RequestInit {
    skipAuth?: boolean;
}

export type GetToken = () => Promise<string | null>;

/**
 * Token loading state check result.
 */
export interface TokenState {
    isLoaded: boolean;
    hasToken: boolean;
}

/**
 * API error response type.
 */
export interface ApiErrorResponse {
    error: string;
    status: number;
}

/**
 * Result type for API calls.
 */
export type ApiResult<T> = { data: T; error?: never } | { data?: never; error: ApiErrorResponse };

/**
 * Create an authenticated fetch function using the provided getToken function.
 *
 * @param getToken - Function from Clerk's useAuth that retrieves the JWT token
 * @returns A fetch function that automatically includes the Bearer token
 */
export function createAuthFetch(getToken: GetToken) {
    return async function authFetch(
        endpoint: string,
        options: AuthFetchOptions = {}
    ): Promise<Response> {
        const { skipAuth = false, ...fetchOptions } = options;

        // Build headers
        const headers = new Headers(fetchOptions.headers || {});

        // Add auth token if not skipping
        if (!skipAuth) {
            const token = await getToken();
            if (!token) {
                throw new AuthError("No authentication token available", 401);
            }
            headers.set("Authorization", `Bearer ${token}`);
        }

        // Always set JSON content type for POST/PATCH/DELETE with body
        if (fetchOptions.body && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

        return fetch(url, {
            ...fetchOptions,
            headers,
        });
    };
}

/**
 * Custom error class for authentication failures.
 */
export class AuthError extends Error {
    status: number;

    constructor(message: string, status: number = 401) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}

/**
 * Parse API response and return structured result.
 */
export async function parseApiResponse<T>(response: Response): Promise<ApiResult<T>> {
    try {
        const data = await response.json();

        if (!response.ok) {
            return {
                error: {
                    error: data.error || data.message || "Request failed",
                    status: response.status,
                },
            };
        }

        return { data: data as T };
    } catch {
        return {
            error: {
                error: "Failed to parse response",
                status: response.status,
            },
        };
    }
}

/**
 * Check if an error is an authentication error.
 */
export function isAuthError(error: unknown): error is AuthError {
    return error instanceof AuthError;
}

/**
 * Check if API result is an error.
 */
export function isApiError<T>(result: ApiResult<T>): result is { error: ApiErrorResponse } {
    return "error" in result && result.error !== undefined;
}
