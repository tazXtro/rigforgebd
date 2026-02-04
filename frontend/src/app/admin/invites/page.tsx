"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useAdminAuth } from "@/components/providers/AdminAuthProvider";
import {
    createInvite,
    getPendingInvites,
    getInviteUrl,
    Invite,
} from "@/lib/adminApi";
import Link from "next/link";

/**
 * Admin invites management page.
 * 
 * Allows admins to create new invites and view pending invites.
 */
export default function AdminInvitesPage() {
    const { user } = useUser();
    const { isAdmin } = useAdminAuth();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [targetEmail, setTargetEmail] = useState("");
    const [expiresHours, setExpiresHours] = useState(72);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const email = user?.primaryEmailAddress?.emailAddress || "";

    // Load pending invites
    useEffect(() => {
        if (email && isAdmin) {
            loadInvites();
        }
    }, [email, isAdmin]);

    const loadInvites = async () => {
        const pending = await getPendingInvites(email);
        setInvites(pending);
    };

    const handleCreateInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsCreating(true);

        const { invite, error: createError } = await createInvite(
            email,
            targetEmail,
            expiresHours
        );

        setIsCreating(false);

        if (createError) {
            setError(createError);
            return;
        }

        if (invite) {
            setSuccess(`Invite created for ${targetEmail}`);
            setTargetEmail("");
            loadInvites();
        }
    };

    const copyInviteLink = async (token: string) => {
        const url = getInviteUrl(token);
        await navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-foreground">
                            Manage Admin Invites
                        </h1>
                        <Link
                            href="/admin"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Back to Admin
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Create Invite Form */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Create New Invite
                        </h2>

                        <form onSubmit={handleCreateInvite} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-foreground mb-1"
                                >
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={targetEmail}
                                    onChange={(e) => setTargetEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    required
                                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Only this email address will be able to accept the invite.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="expires"
                                    className="block text-sm font-medium text-foreground mb-1"
                                >
                                    Expires In (hours)
                                </label>
                                <select
                                    id="expires"
                                    value={expiresHours}
                                    onChange={(e) => setExpiresHours(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value={24}>24 hours (1 day)</option>
                                    <option value={72}>72 hours (3 days)</option>
                                    <option value={168}>168 hours (1 week)</option>
                                </select>
                            </div>

                            {error && (
                                <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 rounded-md p-3">
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isCreating || !targetEmail}
                                className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? "Creating..." : "Create Invite"}
                            </button>
                        </form>
                    </div>

                    {/* Pending Invites */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Pending Invites ({invites.length})
                        </h2>

                        {invites.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No pending invites. Create one above!
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {invites.map((invite) => (
                                    <li
                                        key={invite.id}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                                    >
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {invite.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Expires: {new Date(invite.expires_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copyInviteLink(invite.token)}
                                            className="text-sm px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                        >
                                            {copiedToken === invite.token ? "Copied!" : "Copy Link"}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
