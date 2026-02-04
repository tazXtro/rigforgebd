"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { AdminAuthProvider, useAdminAuth } from "@/components/providers/AdminAuthProvider";

/**
 * Admin layout wrapper that protects all /admin routes.
 * 
 * - Requires Clerk authentication
 * - Checks admin status via backend API
 * - Redirects non-admins to home page
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
            <SignedIn>
                <AdminAuthProvider>
                    <AdminGuard>{children}</AdminGuard>
                </AdminAuthProvider>
            </SignedIn>
        </>
    );
}

/**
 * Guard component that checks admin status and redirects non-admins.
 */
function AdminGuard({ children }: { children: React.ReactNode }) {
    const { isAdmin, isLoading } = useAdminAuth();
    const { isLoaded } = useUser();
    const router = useRouter();

    useEffect(() => {
        // Wait for both Clerk and admin check to complete
        if (isLoaded && !isLoading && !isAdmin) {
            router.push("/");
        }
    }, [isLoaded, isLoading, isAdmin, router]);

    // Show loading state while checking
    if (!isLoaded || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    // If not admin, show nothing (redirect is happening)
    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                    <p className="text-muted-foreground">You do not have admin privileges.</p>
                    <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
