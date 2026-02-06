"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    Check,
    X,
    Clock,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Eye,
    Cpu,
    HardDrive,
    MemoryStick,
    Monitor,
    Fan,
    Box,
    Zap,
    CircuitBoard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import {
    getPendingBuilds,
    approveBuild,
    rejectBuild,
    PendingBuild,
    BuildComponent,
} from "@/lib/moderationApi";

export default function BuildsApprovalPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [builds, setBuilds] = useState<PendingBuild[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedBuild, setSelectedBuild] = useState<PendingBuild | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const pageSize = 12;
    const totalPages = Math.ceil(total / pageSize);

    const userEmail = user?.primaryEmailAddress?.emailAddress || "";

    const fetchBuilds = useCallback(async () => {
        if (!userEmail) return;

        setLoading(true);
        try {
            const data = await getPendingBuilds(userEmail, page, pageSize);
            setBuilds(data.builds);
            setTotal(data.total);
        } catch (error) {
            toast.error("Failed to fetch pending builds");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [userEmail, page]);

    useEffect(() => {
        if (isSignedIn) {
            fetchBuilds();
        }
    }, [isSignedIn, fetchBuilds]);

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

    const handleApprove = async (buildId: string) => {
        if (!userEmail) return;

        setProcessingId(buildId);
        try {
            await approveBuild(buildId, userEmail);
            toast.success("Build approved successfully!");
            setBuilds((prev) => prev.filter((b) => b.id !== buildId));
            setTotal((prev) => prev - 1);
        } catch (error) {
            toast.error("Failed to approve build");
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!userEmail || !selectedBuild) return;

        setProcessingId(selectedBuild.id);
        try {
            await rejectBuild(selectedBuild.id, userEmail, rejectReason);
            toast.success("Build rejected");
            setBuilds((prev) => prev.filter((b) => b.id !== selectedBuild.id));
            setTotal((prev) => prev - 1);
            setRejectModalOpen(false);
            setSelectedBuild(null);
            setRejectReason("");
        } catch (error) {
            toast.error("Failed to reject build");
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (build: PendingBuild) => {
        setSelectedBuild(build);
        setRejectModalOpen(true);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("en-BD", {
            style: "currency",
            currency: "BDT",
            minimumFractionDigits: 0,
        }).format(price);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "CPU": return <Cpu className="h-4 w-4" />;
            case "GPU": return <Monitor className="h-4 w-4" />;
            case "Motherboard": return <CircuitBoard className="h-4 w-4" />;
            case "RAM": return <MemoryStick className="h-4 w-4" />;
            case "Storage": return <HardDrive className="h-4 w-4" />;
            case "PSU": return <Zap className="h-4 w-4" />;
            case "Case": return <Box className="h-4 w-4" />;
            case "Cooler": return <Fan className="h-4 w-4" />;
            case "Monitor": return <Monitor className="h-4 w-4" />;
            default: return <Box className="h-4 w-4" />;
        }
    };

    const getSelectedComponents = (components: BuildComponent[]) => {
        return (components || []).filter((c) => c.product !== null);
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
                                <h1 className="text-2xl font-bold">Builds Approval</h1>
                                <p className="text-sm text-muted-foreground">
                                    Review and approve pending PC builds
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                            <Clock className="h-4 w-4 mr-2" />
                            {total} Pending
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : builds.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center min-h-[400px] text-center"
                    >
                        <div className="rounded-full bg-green-500/10 p-6 mb-4">
                            <Check className="h-12 w-12 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
                        <p className="text-muted-foreground">
                            No builds are pending approval right now.
                        </p>
                    </motion.div>
                ) : (
                    <>
                        {/* Build Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence mode="popLayout">
                                {builds.map((build, index) => (
                                    <motion.div
                                        key={build.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                        layout
                                    >
                                        <Card className="group overflow-hidden hover:border-primary/50 transition-all duration-300">
                                            {/* Image */}
                                            <div className="relative aspect-video overflow-hidden bg-muted">
                                                {build.image_url ? (
                                                    <Image
                                                        src={build.image_url}
                                                        alt={build.title}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <Badge className="absolute top-2 right-2 bg-yellow-500 text-yellow-950">
                                                    Pending
                                                </Badge>
                                            </div>

                                            {/* Content */}
                                            <CardHeader className="pb-2">
                                                <h3 className="font-semibold line-clamp-1">{build.title}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    {build.users?.avatar_url && (
                                                        <Image
                                                            src={build.users.avatar_url}
                                                            alt={build.users.username || "Author"}
                                                            width={20}
                                                            height={20}
                                                            className="rounded-full"
                                                        />
                                                    )}
                                                    <span>{build.users?.username || build.users?.display_name || "Unknown"}</span>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="pb-2">
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {build.description}
                                                </p>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium text-primary">
                                                        {formatPrice(build.total_price)}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {formatDate(build.created_at)}
                                                    </span>
                                                </div>
                                            </CardContent>

                                            {/* Actions */}
                                            <CardFooter className="pt-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => setSelectedBuild(build)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Preview
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-primary hover:bg-primary/90"
                                                    onClick={() => handleApprove(build.id)}
                                                    disabled={processingId === build.id}
                                                >
                                                    {processingId === build.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
                                                    onClick={() => openRejectModal(build)}
                                                    disabled={processingId === build.id}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Preview Modal */}
            <Dialog open={!!selectedBuild && !rejectModalOpen} onOpenChange={() => setSelectedBuild(null)}>
                <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0">
                    {selectedBuild && (
                        <>
                            <DialogHeader className="px-6 pt-6 pb-0">
                                <DialogTitle className="text-lg">{selectedBuild.title}</DialogTitle>
                                <DialogDescription>
                                    By {selectedBuild.users?.username || selectedBuild.users?.display_name || "Unknown"} •{" "}
                                    {formatDate(selectedBuild.created_at)}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                {selectedBuild.image_url && (
                                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                                        <Image
                                            src={selectedBuild.image_url}
                                            alt={selectedBuild.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}

                                <div>
                                    <h4 className="font-medium mb-1">Description</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {selectedBuild.description}
                                    </p>
                                </div>

                                {/* Components / Parts List */}
                                {getSelectedComponents(selectedBuild.components).length > 0 && (
                                    <div>
                                        <Separator className="my-2" />
                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                            PC Components
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {getSelectedComponents(selectedBuild.components).length} parts
                                            </Badge>
                                        </h4>
                                        <div className="space-y-2">
                                            {getSelectedComponents(selectedBuild.components).map((slot) => (
                                                <div
                                                    key={slot.id}
                                                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                                                >
                                                    {/* Product Image */}
                                                    {slot.product?.image ? (
                                                        <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-background border">
                                                            <Image
                                                                src={slot.product.image}
                                                                alt={slot.product.name}
                                                                fill
                                                                className="object-contain p-0.5"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-12 w-12 shrink-0 rounded-md bg-background border flex items-center justify-center text-muted-foreground">
                                                            {getCategoryIcon(slot.category)}
                                                        </div>
                                                    )}

                                                    {/* Product Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <Badge variant="outline" className="text-xs shrink-0">
                                                                {slot.category}
                                                            </Badge>
                                                            {slot.quantity > 1 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    ×{slot.quantity}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-medium leading-snug break-words">
                                                            {slot.product?.name}
                                                        </p>
                                                        {slot.product?.brand && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {slot.product.brand}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Price */}
                                                    <div className="text-right shrink-0 pt-0.5">
                                                        <p className="text-sm font-semibold text-primary whitespace-nowrap">
                                                            {formatPrice(
                                                                (slot.product?.minPrice || slot.product?.basePrice || 0) * slot.quantity
                                                            )}
                                                        </p>
                                                        {slot.selectedRetailer && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {slot.selectedRetailer}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <Separator className="my-2" />
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <span className="font-medium">Total Price</span>
                                    <span className="text-xl font-bold text-primary">
                                        {formatPrice(selectedBuild.total_price)}
                                    </span>
                                </div>
                            </div>

                            <DialogFooter className="px-6 pb-6 pt-4 gap-3 border-t">
                                <Button
                                    variant="outline"
                                    className="border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
                                    onClick={() => openRejectModal(selectedBuild)}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                                <Button
                                    className="bg-primary hover:bg-primary/90"
                                    onClick={() => {
                                        handleApprove(selectedBuild.id);
                                        setSelectedBuild(null);
                                    }}
                                    disabled={processingId === selectedBuild.id}
                                >
                                    {processingId === selectedBuild.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Approve Build
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Build</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting &quot;{selectedBuild?.title}&quot;. This will be visible to the author.
                        </DialogDescription>
                    </DialogHeader>

                    <Textarea
                        placeholder="Enter rejection reason (optional)..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={4}
                    />

                    <DialogFooter className="gap-3">
                        <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleReject}
                            disabled={processingId === selectedBuild?.id}
                        >
                            {processingId === selectedBuild?.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <X className="h-4 w-4 mr-2" />
                            )}
                            Reject Build
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
