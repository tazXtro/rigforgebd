"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { createAdminApi, AdminProfile } from "@/lib/adminApi";

interface AdminAuthContextType {
    isAdmin: boolean;
    isLoading: boolean;
    adminProfile: AdminProfile | null;
    adminEmail: string;
    checkAdmin: () => Promise<void>;
    refreshAdmin: () => Promise<void>;
    /** Get the authenticated API instance for making admin API calls */
    getAdminApi: () => ReturnType<typeof createAdminApi> | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
    children: ReactNode;
}

/**
 * Provider component that manages admin authentication state.
 *
 * Uses Clerk JWT tokens for secure authentication with the backend.
 * Provides admin status and authenticated API access throughout the admin area.
 */
export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
    const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
    const { getToken, isLoaded: isAuthLoaded } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

    // Create API instance with getToken - memoized to avoid recreating on every render
    const adminApi = useMemo(() => {
        if (!getToken) return null;
        return createAdminApi(getToken);
    }, [getToken]);

    const adminEmail = user?.primaryEmailAddress?.emailAddress || "";

    const checkAdmin = useCallback(async () => {
        // Wait for both user and auth to be loaded
        if (!isUserLoaded || !isAuthLoaded) {
            return;
        }

        if (!isSignedIn || !adminEmail || !adminApi) {
            setIsAdmin(false);
            setAdminProfile(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            // Use JWT-authenticated API
            const adminStatus = await adminApi.checkAdminStatus();
            setIsAdmin(adminStatus);

            if (adminStatus) {
                const profile = await adminApi.getAdminProfile();
                setAdminProfile(profile);
            } else {
                setAdminProfile(null);
            }
        } catch (error) {
            console.error("[AdminAuthProvider] Error checking admin status:", error);
            setIsAdmin(false);
            setAdminProfile(null);
        } finally {
            setIsLoading(false);
        }
    }, [isUserLoaded, isAuthLoaded, isSignedIn, adminEmail, adminApi]);

    // Check admin status when user or auth state changes
    useEffect(() => {
        checkAdmin();
    }, [checkAdmin]);

    const refreshAdmin = useCallback(async () => {
        await checkAdmin();
    }, [checkAdmin]);

    const getAdminApi = useCallback(() => {
        return adminApi;
    }, [adminApi]);

    return (
        <AdminAuthContext.Provider
            value={{
                isAdmin,
                isLoading,
                adminProfile,
                adminEmail,
                checkAdmin,
                refreshAdmin,
                getAdminApi,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
}

/**
 * Hook to access admin authentication context.
 *
 * Provides:
 * - isAdmin: Whether current user is an admin
 * - isLoading: Whether admin check is in progress
 * - adminProfile: Admin profile data if available
 * - adminEmail: The admin's email address
 * - getAdminApi: Function to get authenticated API instance
 */
export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
}
