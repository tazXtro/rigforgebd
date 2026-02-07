"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    Cpu,
    CircuitBoard,
    MemoryStick,
    AlertTriangle,
    Check,
    Loader2,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Pencil,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import {
    getMissingCompatCounts,
    getMissingCompatRecords,
    updateCompatFields,
    MissingCompatRecord,
    MissingCompatCounts,
} from "@/lib/adminCompatApi";

// ==================== Constants ====================

const SOCKET_OPTIONS = ["AM4", "AM5", "LGA1200", "LGA1700", "LGA1851"];
const MEMORY_TYPE_OPTIONS = ["DDR4", "DDR5"];
const COMMON_SPEEDS = [2133, 2400, 2666, 3000, 3200, 3600, 4000, 4800, 5200, 5600, 6000, 6400, 7200, 8000];

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
    cpu: <Cpu className="h-4 w-4" />,
    motherboard: <CircuitBoard className="h-4 w-4" />,
    ram: <MemoryStick className="h-4 w-4" />,
};

const COMPONENT_COLORS: Record<string, string> = {
    cpu: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    motherboard: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    ram: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const FIELD_LABELS: Record<string, string> = {
    cpu_socket: "CPU Socket",
    mobo_socket: "Motherboard Socket",
    memory_type: "Memory Type",
    memory_max_speed_mhz: "Max Memory Speed (MHz)",
};

// ==================== Component ====================

export default function CompatibilityPage() {
    const { user } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress || "";

    // State
    const [counts, setCounts] = useState<MissingCompatCounts | null>(null);
    const [records, setRecords] = useState<MissingCompatRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Edit modal state
    const [editRecord, setEditRecord] = useState<MissingCompatRecord | null>(null);
    const [editValues, setEditValues] = useState<Record<string, string | number | null>>({});
    const [saving, setSaving] = useState(false);

    const pageSize = 15;
    const totalPages = Math.ceil(total / pageSize);

    // ==================== Data Fetching ====================

    const fetchCounts = useCallback(async () => {
        if (!userEmail) return;
        const { counts: c, error } = await getMissingCompatCounts(userEmail);
        if (error) {
            toast.error(error);
            return;
        }
        if (c) setCounts(c);
    }, [userEmail]);

    const fetchRecords = useCallback(async () => {
        if (!userEmail) return;
        setLoading(true);
        try {
            const { data, error } = await getMissingCompatRecords(
                userEmail,
                filter,
                page,
                pageSize
            );
            if (error) {
                toast.error(error);
                return;
            }
            if (data) {
                setRecords(data.records);
                setTotal(data.total);
            }
        } finally {
            setLoading(false);
        }
    }, [userEmail, filter, page]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [filter]);

    // ==================== Edit Handlers ====================

    const openEdit = (record: MissingCompatRecord) => {
        setEditRecord(record);
        // Pre-fill with current values
        setEditValues({
            cpu_socket: record.cpu_socket || "",
            mobo_socket: record.mobo_socket || "",
            memory_type: record.memory_type || "",
            memory_max_speed_mhz: record.memory_max_speed_mhz || "",
        });
    };

    const closeEdit = () => {
        setEditRecord(null);
        setEditValues({});
    };

    const handleSave = async () => {
        if (!editRecord || !userEmail) return;
        setSaving(true);

        try {
            // Build payload with only the fields relevant to the component type
            const payload: Record<string, unknown> = { admin_email: userEmail };

            if (editRecord.component_type === "cpu") {
                if (editValues.cpu_socket) payload.cpu_socket = editValues.cpu_socket;
            } else if (editRecord.component_type === "motherboard") {
                if (editValues.mobo_socket) payload.mobo_socket = editValues.mobo_socket;
                if (editValues.memory_type) payload.memory_type = editValues.memory_type;
                if (editValues.memory_max_speed_mhz)
                    payload.memory_max_speed_mhz = Number(editValues.memory_max_speed_mhz);
            } else if (editRecord.component_type === "ram") {
                if (editValues.memory_type) payload.memory_type = editValues.memory_type;
                if (editValues.memory_max_speed_mhz)
                    payload.memory_max_speed_mhz = Number(editValues.memory_max_speed_mhz);
            }

            const { success, error } = await updateCompatFields(
                editRecord.product_id,
                payload as unknown as Parameters<typeof updateCompatFields>[1]
            );

            if (error) {
                toast.error(error);
                return;
            }

            if (success) {
                toast.success("Compatibility data updated successfully");
                closeEdit();
                // Refresh
                fetchRecords();
                fetchCounts();
            }
        } finally {
            setSaving(false);
        }
    };

    // ==================== Filtered Records ====================

    const displayedRecords = searchQuery
        ? records.filter(
              (r) =>
                  r.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.product_brand?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : records;

    // ==================== Render ====================

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin">
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    Compatibility Manager
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Fix missing compatibility data for CPU, Motherboard &amp; RAM
                                </p>
                            </div>
                        </div>

                        {/* Count badges */}
                        {counts && (
                            <div className="flex items-center gap-3">
                                <Badge
                                    variant="outline"
                                    className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1.5 px-3 py-1"
                                >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {counts.total} Missing
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Summary Cards */}
                {counts && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(["cpu", "motherboard", "ram"] as const).map((type) => {
                            const count = counts[type];
                            const icon = COMPONENT_ICONS[type];
                            const isActive = filter === type;

                            return (
                                <motion.button
                                    key={type}
                                    onClick={() => setFilter(isActive ? "all" : type)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="text-left"
                                >
                                    <Card
                                        className={`transition-all duration-200 cursor-pointer ${
                                            isActive
                                                ? "ring-2 ring-primary border-primary/50"
                                                : "hover:border-border"
                                        }`}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`p-2.5 rounded-lg border ${COMPONENT_COLORS[type]}`}
                                                    >
                                                        {icon}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground capitalize">
                                                            {type === "ram"
                                                                ? "RAM"
                                                                : type.charAt(0).toUpperCase() +
                                                                  type.slice(1)}
                                                        </p>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {count}
                                                        </p>
                                                    </div>
                                                </div>
                                                {count > 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs"
                                                    >
                                                        Needs Fix
                                                    </Badge>
                                                )}
                                                {count === 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs"
                                                    >
                                                        All Good
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.button>
                            );
                        })}
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by product name or brand..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select
                            value={filter}
                            onValueChange={(v: string) => setFilter(v)}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="cpu">CPU</SelectItem>
                                <SelectItem value="motherboard">Motherboard</SelectItem>
                                <SelectItem value="ram">RAM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <p className="text-sm text-muted-foreground ml-auto">
                        {total} product{total !== 1 ? "s" : ""} with missing data
                    </p>
                </div>

                {/* Records Table */}
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : displayedRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Check className="h-12 w-12 text-emerald-500" />
                                <p className="text-lg font-medium text-foreground">
                                    {filter === "all"
                                        ? "All compatibility data is complete!"
                                        : `No missing data for ${filter.toUpperCase()}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    All products have their critical compatibility fields filled in.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/50 bg-muted/30">
                                            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Product
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Missing Fields
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Current Values
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Confidence
                                            </th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {displayedRecords.map((record, i) => (
                                                <motion.tr
                                                    key={record.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                                                >
                                                    {/* Product */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            {record.product_image_url ? (
                                                                <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                                                    <Image
                                                                        src={record.product_image_url}
                                                                        alt={record.product_name || "Product"}
                                                                        fill
                                                                        className="object-contain"
                                                                        sizes="40px"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                                    {COMPONENT_ICONS[record.component_type]}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate max-w-[250px]">
                                                                    {record.product_name || "Unknown Product"}
                                                                </p>
                                                                {record.product_brand && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {record.product_brand}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Type */}
                                                    <td className="px-4 py-3">
                                                        <Badge
                                                            variant="outline"
                                                            className={`${COMPONENT_COLORS[record.component_type]} gap-1 text-xs`}
                                                        >
                                                            {COMPONENT_ICONS[record.component_type]}
                                                            {record.component_type === "ram"
                                                                ? "RAM"
                                                                : record.component_type
                                                                      .charAt(0)
                                                                      .toUpperCase() +
                                                                  record.component_type.slice(1)}
                                                        </Badge>
                                                    </td>

                                                    {/* Missing Fields */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {record.missing_fields.map((field) => (
                                                                <Badge
                                                                    key={field}
                                                                    variant="outline"
                                                                    className="bg-red-500/10 text-red-500 border-red-500/20 text-xs"
                                                                >
                                                                    {FIELD_LABELS[field] || field}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    {/* Current Values */}
                                                    <td className="px-4 py-3">
                                                        <div className="space-y-0.5 text-xs text-muted-foreground">
                                                            {record.component_type === "cpu" && (
                                                                <p>
                                                                    Socket:{" "}
                                                                    <span
                                                                        className={
                                                                            record.cpu_socket
                                                                                ? "text-foreground font-medium"
                                                                                : "text-red-400 italic"
                                                                        }
                                                                    >
                                                                        {record.cpu_socket || "NULL"}
                                                                    </span>
                                                                </p>
                                                            )}
                                                            {record.component_type === "motherboard" && (
                                                                <>
                                                                    <p>
                                                                        Socket:{" "}
                                                                        <span
                                                                            className={
                                                                                record.mobo_socket
                                                                                    ? "text-foreground font-medium"
                                                                                    : "text-red-400 italic"
                                                                            }
                                                                        >
                                                                            {record.mobo_socket || "NULL"}
                                                                        </span>
                                                                    </p>
                                                                    <p>
                                                                        Memory:{" "}
                                                                        <span
                                                                            className={
                                                                                record.memory_type
                                                                                    ? "text-foreground font-medium"
                                                                                    : "text-red-400 italic"
                                                                            }
                                                                        >
                                                                            {record.memory_type || "NULL"}
                                                                        </span>
                                                                    </p>
                                                                    <p>
                                                                        Speed:{" "}
                                                                        <span
                                                                            className={
                                                                                record.memory_max_speed_mhz
                                                                                    ? "text-foreground font-medium"
                                                                                    : "text-red-400 italic"
                                                                            }
                                                                        >
                                                                            {record.memory_max_speed_mhz
                                                                                ? `${record.memory_max_speed_mhz} MHz`
                                                                                : "NULL"}
                                                                        </span>
                                                                    </p>
                                                                </>
                                                            )}
                                                            {record.component_type === "ram" && (
                                                                <>
                                                                    <p>
                                                                        Type:{" "}
                                                                        <span
                                                                            className={
                                                                                record.memory_type
                                                                                    ? "text-foreground font-medium"
                                                                                    : "text-red-400 italic"
                                                                            }
                                                                        >
                                                                            {record.memory_type || "NULL"}
                                                                        </span>
                                                                    </p>
                                                                    <p>
                                                                        Speed:{" "}
                                                                        <span
                                                                            className={
                                                                                record.memory_max_speed_mhz
                                                                                    ? "text-foreground font-medium"
                                                                                    : "text-red-400 italic"
                                                                            }
                                                                        >
                                                                            {record.memory_max_speed_mhz
                                                                                ? `${record.memory_max_speed_mhz} MHz`
                                                                                : "NULL"}
                                                                        </span>
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Confidence */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        record.confidence >= 0.7
                                                                            ? "bg-emerald-500"
                                                                            : record.confidence >= 0.4
                                                                            ? "bg-yellow-500"
                                                                            : "bg-red-500"
                                                                    }`}
                                                                    style={{
                                                                        width: `${Math.round(record.confidence * 100)}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {Math.round(record.confidence * 100)}%
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Action */}
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEdit(record)}
                                                            className="gap-1.5"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Fix
                                                        </Button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ==================== Edit Dialog ==================== */}
            <Dialog open={!!editRecord} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editRecord && COMPONENT_ICONS[editRecord.component_type]}
                            Fix Compatibility Data
                        </DialogTitle>
                        <DialogDescription>
                            {editRecord?.product_name && (
                                <span className="block mt-1 font-medium text-foreground">
                                    {editRecord.product_name}
                                </span>
                            )}
                            {editRecord && (
                                <span className="block mt-1">
                                    Fill in the missing fields to enable compatibility matching.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {editRecord && (
                        <div className="space-y-4 py-2">
                            {/* Missing fields indicator */}
                            <div className="flex flex-wrap gap-1.5">
                                {editRecord.missing_fields.map((f) => (
                                    <Badge
                                        key={f}
                                        variant="outline"
                                        className="bg-red-500/10 text-red-500 border-red-500/20 text-xs"
                                    >
                                        {FIELD_LABELS[f] || f} — missing
                                    </Badge>
                                ))}
                            </div>

                            <Separator />

                            {/* CPU Socket */}
                            {editRecord.component_type === "cpu" && (
                                <div className="space-y-2">
                                    <Label htmlFor="cpu_socket">
                                        CPU Socket{" "}
                                        {editRecord.missing_fields.includes("cpu_socket") && (
                                            <span className="text-red-500">*</span>
                                        )}
                                    </Label>
                                    <Select
                                        value={
                                            SOCKET_OPTIONS.includes(String(editValues.cpu_socket))
                                                ? String(editValues.cpu_socket)
                                                : ""
                                        }
                                        onValueChange={(v: string) =>
                                            setEditValues((prev) => ({ ...prev, cpu_socket: v }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select common socket..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SOCKET_OPTIONS.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Or type a custom value:
                                    </p>
                                    <Input
                                        placeholder="e.g. sTR5, LGA4677"
                                        value={String(editValues.cpu_socket || "")}
                                        onChange={(e) =>
                                            setEditValues((prev) => ({
                                                ...prev,
                                                cpu_socket: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            )}

                            {/* Motherboard Socket */}
                            {editRecord.component_type === "motherboard" && (
                                <div className="space-y-2">
                                    <Label htmlFor="mobo_socket">
                                        Motherboard Socket{" "}
                                        {editRecord.missing_fields.includes("mobo_socket") && (
                                            <span className="text-red-500">*</span>
                                        )}
                                    </Label>
                                    <Select
                                        value={
                                            SOCKET_OPTIONS.includes(String(editValues.mobo_socket))
                                                ? String(editValues.mobo_socket)
                                                : ""
                                        }
                                        onValueChange={(v: string) =>
                                            setEditValues((prev) => ({ ...prev, mobo_socket: v }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select common socket..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SOCKET_OPTIONS.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Or type a custom value:
                                    </p>
                                    <Input
                                        placeholder="e.g. sTR5, LGA4677"
                                        value={String(editValues.mobo_socket || "")}
                                        onChange={(e) =>
                                            setEditValues((prev) => ({
                                                ...prev,
                                                mobo_socket: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            )}

                            {/* Memory Type (for motherboard & RAM) */}
                            {(editRecord.component_type === "motherboard" ||
                                editRecord.component_type === "ram") && (
                                <div className="space-y-2">
                                    <Label htmlFor="memory_type">
                                        Memory Type{" "}
                                        {editRecord.missing_fields.includes("memory_type") && (
                                            <span className="text-red-500">*</span>
                                        )}
                                    </Label>
                                    <Select
                                        value={
                                            MEMORY_TYPE_OPTIONS.includes(String(editValues.memory_type))
                                                ? String(editValues.memory_type)
                                                : ""
                                        }
                                        onValueChange={(v: string) =>
                                            setEditValues((prev) => ({ ...prev, memory_type: v }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select memory type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MEMORY_TYPE_OPTIONS.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Or type a custom value:
                                    </p>
                                    <Input
                                        placeholder="e.g. DDR3, LPDDR5X"
                                        value={String(editValues.memory_type || "")}
                                        onChange={(e) =>
                                            setEditValues((prev) => ({
                                                ...prev,
                                                memory_type: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            )}

                            {/* Memory Speed (for RAM only) */}
                            {editRecord.component_type === "ram" && (
                                <div className="space-y-2">
                                    <Label htmlFor="memory_max_speed_mhz">
                                        Max Memory Speed (MHz){" "}
                                        {editRecord.missing_fields.includes(
                                            "memory_max_speed_mhz"
                                        ) && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Select
                                        value={String(editValues.memory_max_speed_mhz || "")}
                                        onValueChange={(v: string) =>
                                            setEditValues((prev) => ({
                                                ...prev,
                                                memory_max_speed_mhz: v,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select speed..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMMON_SPEEDS.map((s) => (
                                                <SelectItem key={s} value={String(s)}>
                                                    {s} MHz
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Or enter a custom value:
                                    </p>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 3600"
                                        value={editValues.memory_max_speed_mhz || ""}
                                        onChange={(e) =>
                                            setEditValues((prev) => ({
                                                ...prev,
                                                memory_max_speed_mhz: e.target.value
                                                    ? Number(e.target.value)
                                                    : "",
                                            }))
                                        }
                                        min={800}
                                        max={20000}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex flex-row justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={closeEdit} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
