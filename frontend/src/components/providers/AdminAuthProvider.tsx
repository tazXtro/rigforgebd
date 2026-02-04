"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { checkAdminStatus, getAdminProfile, AdminProfile } from "@/lib/adminApi";

interface AdminAuthContextType {
    isAdmin: boolean;
    isLoading: boolean;
    adminProfile: AdminProfile | null;
    checkAdmin: () => Promise<void>;
    refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
    children: ReactNode;
}

/**
 * Provider component that manages admin authentication state.
 * 
 * Checks if the current Clerk user is an admin and provides
 * admin status throughout the admin area of the app.
 */
export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
    const { user, isLoaded, isSignedIn } = useUser();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

    const checkAdmin = useCallback(async () => {
        if (!isLoaded || !isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
            setIsAdmin(false);
            setAdminProfile(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const email = user.primaryEmailAddress.emailAddress;

        try {
            const adminStatus = await checkAdminStatus(email);
            setIsAdmin(adminStatus);

            if (adminStatus) {
                const profile = await getAdminProfile(email);
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
    }, [isLoaded, isSignedIn, user]);

    // Check admin status when user changes
    useEffect(() => {
        checkAdmin();
    }, [checkAdmin]);

    const refreshAdmin = useCallback(async () => {
        await checkAdmin();
    }, [checkAdmin]);

    return (
        <AdminAuthContext.Provider
            value={{
                isAdmin,
                isLoading,
                adminProfile,
                checkAdmin,
                refreshAdmin,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
}

/**
 * Hook to access admin authentication context.
 */
export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
}
