"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    MessageCircle,
    Ban,
    Clock,
    Trash2,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Shield,
    User,
    ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import {
    createModerationApi,
    ModerationComment,
    Sanction,
} from "@/lib/moderationApi";

const DURATION_OPTIONS = [
    { value: "1", label: "1 Day" },
    { value: "3", label: "3 Days" },
    { value: "7", label: "1 Week" },
    { value: "30", label: "1 Month" },
    { value: "permanent", label: "Permanent Ban" },
];

export default function ModerationPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken, isLoaded: isAuthLoaded } = useAuth();
    const [activeTab, setActiveTab] = useState("comments");

    // Comments state
    const [comments, setComments] = useState<ModerationComment[]>([]);
    const [commentsTotal, setCommentsTotal] = useState(0);
    const [commentsPage, setCommentsPage] = useState(1);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Sanctions state
    const [sanctions, setSanctions] = useState<Sanction[]>([]);
    const [sanctionsTotal, setSanctionsTotal] = useState(0);
    const [sanctionsPage, setSanctionsPage] = useState(1);
    const [sanctionsLoading, setSanctionsLoading] = useState(true);

    // Modal state
    const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null);
    const [sanctionDuration, setSanctionDuration] = useState("7");
    const [sanctionReason, setSanctionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const pageSize = 20;
    const commentsTotalPages = Math.ceil(commentsTotal / pageSize);
    const sanctionsTotalPages = Math.ceil(sanctionsTotal / pageSize);

    // Create JWT-authenticated moderation API
    const moderationApi = useMemo(() => {
        if (!getToken) return null;
        return createModerationApi(getToken);
    }, [getToken]);

    const fetchComments = useCallback(async () => {
        if (!moderationApi) return;

        setCommentsLoading(true);
        try {
            const data = await moderationApi.getAllComments(commentsPage, pageSize, searchQuery);
            setComments(data.comments);
            setCommentsTotal(data.total);
        } catch (error) {
            toast.error("Failed to fetch comments");
            console.error(error);
        } finally {
            setCommentsLoading(false);
        }
    }, [moderationApi, commentsPage, searchQuery]);

    const fetchSanctions = useCallback(async () => {
        if (!moderationApi) return;

        setSanctionsLoading(true);
        try {
            const data = await moderationApi.getActiveSanctions(sanctionsPage, pageSize);
            setSanctions(data.sanctions);
            setSanctionsTotal(data.total);
        } catch (error) {
            toast.error("Failed to fetch sanctions");
            console.error(error);
        } finally {
            setSanctionsLoading(false);
        }
    }, [moderationApi, sanctionsPage]);

    useEffect(() => {
        if (isSignedIn && moderationApi) {
            if (activeTab === "comments") {
                fetchComments();
            } else {
                fetchSanctions();
            }
        }
    }, [isSignedIn, moderationApi, activeTab, fetchComments, fetchSanctions]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isSignedIn) {
        redirect("/login");
    }

    const openSanctionModal = (userId: string, username: string) => {
        setSelectedUser({ id: userId, username });
        setSanctionModalOpen(true);
    };

    const handleCreateSanction = async () => {
        if (!moderationApi || !selectedUser) return;

        setProcessing(true);
        try {
            const isPermanent = sanctionDuration === "permanent";
            await moderationApi.createSanction(
                selectedUser.id,
                isPermanent ? "permanent_ban" : "timeout",
                sanctionReason || undefined,
                isPermanent ? undefined : parseInt(sanctionDuration)
            );
            toast.success(`User ${selectedUser.username} has been sanctioned`);
            setSanctionModalOpen(false);
            setSelectedUser(null);
            setSanctionReason("");
            setSanctionDuration("7");
            // Refresh both lists
            fetchComments();
            fetchSanctions();
        } catch (error) {
            toast.error("Failed to create sanction");
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveSanction = async (sanctionId: string) => {
        if (!moderationApi) return;

        setProcessing(true);
        try {
            await moderationApi.removeSanction(sanctionId);
            toast.success("Sanction removed");
            setSanctions((prev) => prev.filter((s) => s.id !== sanctionId));
            setSanctionsTotal((prev) => prev - 1);
        } catch (error) {
            toast.error("Failed to remove sanction");
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatTimeRemaining = (expiresAt: string | null) => {
        if (!expiresAt) return "Permanent";

        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) return "Expired";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h remaining`;
        return `${hours}h remaining`;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold">Moderation</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage comments and user sanctions
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                            <Shield className="h-4 w-4 mr-2" />
                            {sanctionsTotal} Active Sanctions
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="comments" className="gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Comments Log
                        </TabsTrigger>
                        <TabsTrigger value="sanctions" className="gap-2">
                            <Ban className="h-4 w-4" />
                            Sanctioned Users
                        </TabsTrigger>
                    </TabsList>

                    {/* Comments Tab */}
                    <TabsContent value="comments">
                        <Card>
                            <CardContent className="pt-6">
                                {/* Search */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search comments..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button onClick={fetchComments} variant="outline">
                                        Search
                                    </Button>
                                </div>

                                {commentsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No comments found
                                    </div>
                                ) : (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead className="w-[40%]">Comment</TableHead>
                                                    <TableHead>Build</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <AnimatePresence>
                                                    {comments.map((comment) => (
                                                        <motion.tr
                                                            key={comment.id}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="group"
                                                        >
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    {comment.users?.avatar_url ? (
                                                                        <Image
                                                                            src={comment.users.avatar_url}
                                                                            alt={comment.users.username || "User"}
                                                                            width={32}
                                                                            height={32}
                                                                            className="rounded-full"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                                            <User className="h-4 w-4" />
                                                                        </div>
                                                                    )}
                                                                    <span className="font-medium">
                                                                        {comment.users?.username || comment.users?.display_name || "Unknown"}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="text-sm line-clamp-2">{comment.content}</p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Link
                                                                    href={`/builds/${comment.builds?.id}`}
                                                                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                                                                >
                                                                    {comment.builds?.title || "Unknown"}
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {formatDate(comment.created_at)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => openSanctionModal(
                                                                        comment.users?.id || "",
                                                                        comment.users?.username || comment.users?.display_name || "User"
                                                                    )}
                                                                >
                                                                    <Ban className="h-4 w-4 mr-1" />
                                                                    Ban
                                                                </Button>
                                                            </TableCell>
                                                        </motion.tr>
                                                    ))}
                                                </AnimatePresence>
                                            </TableBody>
                                        </Table>

                                        {/* Pagination */}
                                        {commentsTotalPages > 1 && (
                                            <div className="flex items-center justify-center gap-4 mt-6">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setCommentsPage((p) => Math.max(1, p - 1))}
                                                    disabled={commentsPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-sm">
                                                    Page {commentsPage} of {commentsTotalPages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setCommentsPage((p) => Math.min(commentsTotalPages, p + 1))}
                                                    disabled={commentsPage === commentsTotalPages}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Sanctions Tab */}
                    <TabsContent value="sanctions">
                        <Card>
                            <CardContent className="pt-6">
                                {sanctionsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : sanctions.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No active sanctions
                                    </div>
                                ) : (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Reason</TableHead>
                                                    <TableHead>Duration</TableHead>
                                                    <TableHead>Created</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <AnimatePresence>
                                                    {sanctions.map((sanction) => (
                                                        <motion.tr
                                                            key={sanction.id}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                        >
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    {sanction.users?.avatar_url ? (
                                                                        <Image
                                                                            src={sanction.users.avatar_url}
                                                                            alt={sanction.users.username || "User"}
                                                                            width={32}
                                                                            height={32}
                                                                            className="rounded-full"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                                            <User className="h-4 w-4" />
                                                                        </div>
                                                                    )}
                                                                    <span className="font-medium">
                                                                        {sanction.users?.username || sanction.users?.display_name || "Unknown"}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={sanction.sanction_type === "permanent_ban" ? "destructive" : "secondary"}>
                                                                    {sanction.sanction_type === "permanent_ban" ? "Permanent Ban" : "Timeout"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                                    {sanction.reason || "No reason provided"}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1 text-sm">
                                                                    <Clock className="h-4 w-4" />
                                                                    {formatTimeRemaining(sanction.expires_at)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {formatDate(sanction.created_at)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleRemoveSanction(sanction.id)}
                                                                    disabled={processing}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                                    Remove
                                                                </Button>
                                                            </TableCell>
                                                        </motion.tr>
                                                    ))}
                                                </AnimatePresence>
                                            </TableBody>
                                        </Table>

                                        {/* Pagination */}
                                        {sanctionsTotalPages > 1 && (
                                            <div className="flex items-center justify-center gap-4 mt-6">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setSanctionsPage((p) => Math.max(1, p - 1))}
                                                    disabled={sanctionsPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-sm">
                                                    Page {sanctionsPage} of {sanctionsTotalPages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setSanctionsPage((p) => Math.min(sanctionsTotalPages, p + 1))}
                                                    disabled={sanctionsPage === sanctionsTotalPages}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Sanction Modal */}
            <Dialog open={sanctionModalOpen} onOpenChange={setSanctionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sanction User</DialogTitle>
                        <DialogDescription>
                            Ban or timeout user &quot;{selectedUser?.username}&quot;. This will prevent them from voting and commenting.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Duration</label>
                            <Select value={sanctionDuration} onValueChange={setSanctionDuration}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DURATION_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason (Optional)</label>
                            <Textarea
                                placeholder="Enter reason for sanction..."
                                value={sanctionReason}
                                onChange={(e) => setSanctionReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSanctionModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCreateSanction}
                            disabled={processing}
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Ban className="h-4 w-4 mr-2" />
                            )}
                            {sanctionDuration === "permanent" ? "Permanently Ban" : "Apply Timeout"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
