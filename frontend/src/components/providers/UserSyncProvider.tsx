"use client";

import { useSyncUser } from "@/hooks/useSyncUser";

/**
 * Provider component that syncs the authenticated user with the backend.
 * 
 * Place this inside ClerkProvider and ThemeProvider to ensure
 * the user is synced to Supabase after Clerk authentication.
 */
export function UserSyncProvider({ children }: { children: React.ReactNode }) {
    useSyncUser();
    return <>{children}</>;
}
