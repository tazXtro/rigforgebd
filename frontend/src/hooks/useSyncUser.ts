"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * Hook to sync Clerk user data with the backend Supabase database.
 * 
 * This hook should be called once when the app loads (e.g., in a provider
 * or layout component) to ensure the authenticated user exists in Supabase.
 */
export function useSyncUser() {
    const { user, isSignedIn, isLoaded } = useUser();
    const hasSynced = useRef(false);

    useEffect(() => {
        // Wait for Clerk to load and verify user is signed in
        if (!isLoaded || !isSignedIn || !user) {
            hasSynced.current = false;
            return;
        }

        // Prevent duplicate syncs in the same session
        if (hasSynced.current) return;

        const syncUser = async () => {
            try {
                const email = user.primaryEmailAddress?.emailAddress || "";
                const displayName = user.fullName || user.firstName || user.username || email.split("@")[0] || "User";

                const response = await fetch("http://localhost:8000/api/users/sync/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: email,
                        display_name: displayName,
                        avatar_url: user.imageUrl,
                        provider: "clerk",
                        provider_user_id: user.id,  // Clerk's user ID (e.g., "user_2abc...")
                    }),
                });

                if (response.ok) {
                    hasSynced.current = true;
                    console.log("[useSyncUser] User synced to backend successfully");
                } else {
                    console.error("[useSyncUser] Failed to sync user:", await response.text());
                }
            } catch (error) {
                console.error("[useSyncUser] Error syncing user:", error);
            }
        };

        syncUser();
    }, [isLoaded, isSignedIn, user]);
}
