"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { validateInvite, acceptInvite } from "@/lib/adminApi";
import Link from "next/link";

interface PageProps {
    params: Promise<{ token: string }>;
}

/**
 * Invite acceptance page.
 * 
 * Public route that allows users to accept admin invites.
 * Validates the invite token and checks email match.
 */
export default function InviteAcceptPage({ params }: PageProps) {
    const { token } = use(params);
    const router = useRouter();
    const { user, isLoaded, isSignedIn } = useUser();

    const [inviteEmail, setInviteEmail] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [acceptError, setAcceptError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Validate invite on load
    useEffect(() => {
        const validate = async () => {
            const result = await validateInvite(token);
            setIsValidating(false);

            if (!result.valid) {
                setInviteError(result.error || "Invalid invite");
                return;
            }

            setInviteEmail(result.email || null);
        };

        validate();
    }, [token]);

    // Check email match when user signs in
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const emailMatches = inviteEmail && userEmail && inviteEmail.toLowerCase() === userEmail.toLowerCase();

    const handleAccept = async () => {
        if (!userEmail || !emailMatches) return;

        setIsAccepting(true);
        setAcceptError(null);

        const result = await acceptInvite(token, userEmail);

        if (result.error) {
            setAcceptError(result.error);
            setIsAccepting(false);
            return;
        }

        setSuccess(true);
        setTimeout(() => router.push("/admin"), 2000);
    };

    // Loading state
    if (isValidating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Validating invite...</p>
                </div>
            </div>
        );
    }

    // Invalid invite
    if (inviteError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="max-w-md mx-auto text-center p-8">
                    <div className="text-destructive text-5xl mb-4">✕</div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Invalid Invite
                    </h1>
                    <p className="text-muted-foreground mb-6">{inviteError}</p>
                    <Link
                        href="/"
                        className="text-primary hover:underline"
                    >
                        Go to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="max-w-md mx-auto text-center p-8">
                    <div className="text-green-500 text-5xl mb-4">✓</div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Welcome, Admin!
                    </h1>
                    <p className="text-muted-foreground">
                        You are now an admin. Redirecting to admin panel...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md mx-auto p-8">
                <div className="bg-card border border-border rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
                        Admin Invite
                    </h1>
                    <p className="text-muted-foreground text-center mb-6">
                        You've been invited to become an admin!
                    </p>

                    <div className="bg-muted/50 rounded-md p-4 mb-6">
                        <p className="text-sm text-muted-foreground">
                            This invite is for:
                        </p>
                        <p className="font-medium text-foreground">{inviteEmail}</p>
                    </div>

                    <SignedOut>
                        <p className="text-sm text-muted-foreground mb-4 text-center">
                            Please sign in with <strong>{inviteEmail}</strong> to accept this invite.
                        </p>
                        <div className="flex flex-col gap-3">
                            <SignInButton mode="modal">
                                <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="w-full bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/80 transition-colors">
                                    Create Account
                                </button>
                            </SignUpButton>
                        </div>
                    </SignedOut>

                    <SignedIn>
                        {isLoaded && (
                            <>
                                {emailMatches ? (
                                    <div className="space-y-4">
                                        <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 rounded-md p-3">
                                            ✓ Email verified: {userEmail}
                                        </div>

                                        {acceptError && (
                                            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                                                {acceptError}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleAccept}
                                            disabled={isAccepting}
                                            className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {isAccepting ? "Accepting..." : "Accept Invite"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                                            This invite is for <strong>{inviteEmail}</strong>, but you're signed in as <strong>{userEmail}</strong>.
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center">
                                            Please sign out and sign in with the correct email.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </SignedIn>
                </div>
            </div>
        </div>
    );
}
