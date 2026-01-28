"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * Hook to sync Clerk user data with the backend Supabase database.
 * 
 * This hook should be called once when the app loads (e.g., in a provider
 * or layout component) to ensure the authenticated user exists in Supabase.
 * 
 * Uses username from Clerk (set during signup) as the primary display identifier.
 */
export function useSyncUser() {
    const { user, isSignedIn, isLoaded } = useUser();
    // Track last synced values to detect changes
    const lastSyncedData = useRef<{ username: string; displayName: string; avatarUrl: string } | null>(null);

    useEffect(() => {
        // Wait for Clerk to load and verify user is signed in
        if (!isLoaded || !isSignedIn || !user) {
            lastSyncedData.current = null;
            return;
        }

        const currentUsername = user.username || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "user";
        const currentDisplayName = user.fullName || currentUsername;
        const currentAvatarUrl = user.imageUrl || "";

        // Check if data has changed since last sync
        const hasDataChanged = !lastSyncedData.current ||
            lastSyncedData.current.username !== currentUsername ||
            lastSyncedData.current.displayName !== currentDisplayName ||
            lastSyncedData.current.avatarUrl !== currentAvatarUrl;

        // Skip if nothing changed
        if (!hasDataChanged) return;

        const syncUser = async () => {
            try {
                const email = user.primaryEmailAddress?.emailAddress || "";

                const response = await fetch("http://localhost:8000/api/users/sync/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: email,
                        username: currentUsername,
                        display_name: currentDisplayName,
                        avatar_url: currentAvatarUrl,
                        provider: "clerk",
                        provider_user_id: user.id,  // Clerk's user ID (e.g., "user_2abc...")
                    }),
                });

                if (response.ok) {
                    // Store the synced values to detect future changes
                    lastSyncedData.current = {
                        username: currentUsername,
                        displayName: currentDisplayName,
                        avatarUrl: currentAvatarUrl,
                    };
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
