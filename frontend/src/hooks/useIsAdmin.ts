"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { createAdminApi } from "@/lib/adminApi";

/**
 * Lightweight hook to check if the current user is an admin.
 *
 * Uses JWT token authentication to verify admin status securely.
 * Results are cached per session to avoid redundant API calls.
 *
 * @returns Object containing isAdmin status, loading state, and admin email
 */
export function useIsAdmin() {
    const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
    const { getToken, isLoaded: isAuthLoaded } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // Create API instance with getToken
    const adminApi = useMemo(() => {
        if (!getToken) return null;
        return createAdminApi(getToken);
    }, [getToken]);

    const checkAdmin = useCallback(async () => {
        if (!isUserLoaded || !isAuthLoaded) return;

        if (!isSignedIn || !user?.primaryEmailAddress?.emailAddress || !adminApi) {
            setIsAdmin(false);
            setIsChecking(false);
            return;
        }

        const email = user.primaryEmailAddress.emailAddress;

        // Check sessionStorage cache first
        const cacheKey = `rigforge_admin_${email}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached !== null) {
            setIsAdmin(cached === "true");
            setIsChecking(false);
            return;
        }

        // Fetch from API with JWT authentication
        setIsChecking(true);
        try {
            const result = await adminApi.checkAdminStatus();
            setIsAdmin(result);
            sessionStorage.setItem(cacheKey, String(result));
        } catch (error) {
            console.error("[useIsAdmin] Error checking admin status:", error);
            setIsAdmin(false);
        } finally {
            setIsChecking(false);
        }
    }, [isUserLoaded, isAuthLoaded, isSignedIn, user, adminApi]);

    useEffect(() => {
        checkAdmin();
    }, [checkAdmin]);

    return {
        isAdmin,
        isChecking,
        adminEmail: isAdmin ? user?.primaryEmailAddress?.emailAddress || "" : "",
    };
}
