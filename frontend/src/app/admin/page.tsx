"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    CheckCircle2,
    Shield,
    Cpu,
    Link2,
    UserPlus,
    Settings,
    X,
} from "lucide-react";
import { getPendingBuildsCount } from "@/lib/moderationApi";
import { getMissingCompatCounts } from "@/lib/adminCompatApi";

interface AdminCard {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    gradient: string;
    glowColor: string;
    badge?: number; // Optional badge count
}

const adminCards: AdminCard[] = [
    {
        id: "builds",
        title: "Builds Approval",
        description: "Review and approve builds",
        icon: <CheckCircle2 className="h-6 w-6" />,
        href: "/admin/builds",
        gradient: "from-emerald-500 to-teal-600",
        glowColor: "rgba(16, 185, 129, 0.5)",
    },
    {
        id: "moderation",
        title: "Moderation",
        description: "Manage bans & reports",
        icon: <Shield className="h-6 w-6" />,
        href: "/admin/moderation",
        gradient: "from-rose-500 to-pink-600",
        glowColor: "rgba(244, 63, 94, 0.5)",
    },
    {
        id: "parts",
        title: "Add/Edit Parts",
        description: "Manage PC components",
        icon: <Cpu className="h-6 w-6" />,
        href: "/admin/parts",
        gradient: "from-violet-500 to-purple-600",
        glowColor: "rgba(139, 92, 246, 0.5)",
    },
    {
        id: "compatibility",
        title: "Compatibility",
        description: "Fix missing compat data",
        icon: <Link2 className="h-6 w-6" />,
        href: "/admin/compatibility",
        gradient: "from-amber-500 to-orange-600",
        glowColor: "rgba(245, 158, 11, 0.5)",
    },
    {
        id: "invites",
        title: "Manage Invites",
        description: "Admin invitation links",
        icon: <UserPlus className="h-6 w-6" />,
        href: "/admin/invites",
        gradient: "from-sky-500 to-blue-600",
        glowColor: "rgba(14, 165, 233, 0.5)",
    },
];

export default function AdminPage() {
    const { user, isSignedIn } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [radius, setRadius] = useState(280);
    const [pendingBuildsCount, setPendingBuildsCount] = useState(0);
    const [missingCompatCount, setMissingCompatCount] = useState(0);
    const router = useRouter();

    const userEmail = user?.primaryEmailAddress?.emailAddress || "";

    // Fetch pending builds count with polling
    useEffect(() => {
        if (!userEmail) return;

        const fetchCount = async () => {
            try {
                const count = await getPendingBuildsCount(userEmail);
                setPendingBuildsCount(count);
            } catch (error) {
                console.error("Failed to fetch pending count:", error);
            }
        };

        // Initial fetch
        fetchCount();

        // Poll every 30 seconds
        const interval = setInterval(fetchCount, 30000);

        return () => clearInterval(interval);
    }, [userEmail]);

    // Fetch missing compat count with polling
    useEffect(() => {
        if (!userEmail) return;

        const fetchCompatCount = async () => {
            try {
                const { counts } = await getMissingCompatCounts(userEmail);
                if (counts) setMissingCompatCount(counts.total);
            } catch (error) {
                console.error("Failed to fetch compat count:", error);
            }
        };

        fetchCompatCount();
        const interval = setInterval(fetchCompatCount, 30000);
        return () => clearInterval(interval);
    }, [userEmail]);

    // Responsive radius based on viewport
    useEffect(() => {
        const updateRadius = () => {
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const minDimension = Math.min(vh, vw);
            // Calculate radius to keep cards within viewport
            // Cards are 220px wide, need enough spacing to prevent overlap
            const maxRadius = (minDimension / 2) - 100;
            setRadius(Math.min(Math.max(maxRadius, 260), 380));
        };

        updateRadius();
        window.addEventListener("resize", updateRadius);
        return () => window.removeEventListener("resize", updateRadius);
    }, []);

    const itemCount = adminCards.length;
    const angleStep = 360 / itemCount;
    const startAngle = -90; // Start from true top for symmetrical layout

    const getCardPosition = (index: number) => {
        const angle = ((startAngle + index * angleStep) * Math.PI) / 180;
        // Use elliptical positioning: horizontal radius is larger to account for wide center card
        const horizontalRadius = radius * 1.3;
        const verticalRadius = radius;
        return {
            x: Math.cos(angle) * horizontalRadius,
            y: Math.sin(angle) * verticalRadius,
        };
    };

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case "ArrowRight":
                case "ArrowDown":
                    e.preventDefault();
                    setActiveIndex((prev) => (prev + 1) % itemCount);
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    e.preventDefault();
                    setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount);
                    break;
                case "Enter":
                    e.preventDefault();
                    if (activeIndex >= 0) {
                        router.push(adminCards[activeIndex].href);
                        setIsOpen(false);
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    setIsOpen(false);
                    break;
            }
        },
        [isOpen, activeIndex, itemCount, router]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/3 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Backdrop when menu is open */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-10 bg-background/80 backdrop-blur-md"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Center container */}
            <div className="relative z-20 min-h-screen flex items-center justify-center">
                {/* Center Trigger Card */}
                <motion.button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative group"
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        scale: isOpen ? 0.9 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    {/* Glow effect */}
                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/40 via-violet-500/40 to-primary/40 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />

                    {/* Rotating border effect */}
                    <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary via-violet-500 to-primary opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                            background: "conic-gradient(from 0deg, var(--primary), #8b5cf6, var(--primary))",
                        }}
                    />

                    {/* Card content */}
                    <div className="relative bg-card/95 backdrop-blur-xl rounded-3xl p-8 min-w-[280px] border border-transparent">
                        <div className="flex flex-col items-center gap-4">
                            {/* Icon container */}
                            <motion.div
                                className="p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-2xl"
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {isOpen ? (
                                    <X className="h-8 w-8" />
                                ) : (
                                    <Settings className="h-8 w-8" />
                                )}
                            </motion.div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-foreground mb-1">
                                    Admin Panel
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    {isOpen ? "Click a card or press Escape" : "Click to open admin tools"}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.button>

                {/* Radial Cards */}
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center">
                            {adminCards.map((card, index) => {
                                const position = getCardPosition(index);
                                const isActive = activeIndex === index;

                                return (
                                    <motion.div
                                        key={card.id}
                                        initial={{
                                            opacity: 0,
                                            x: 0,
                                            y: 0,
                                            scale: 0,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            x: position.x,
                                            y: position.y,
                                            scale: 1,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            x: 0,
                                            y: 0,
                                            scale: 0,
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25,
                                            delay: index * 0.05,
                                        }}
                                        className="absolute"
                                        style={{
                                            pointerEvents: "auto",
                                        }}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onMouseLeave={() => setActiveIndex(-1)}
                                    >
                                        <motion.button
                                            onClick={() => {
                                                router.push(card.href);
                                                setIsOpen(false);
                                            }}
                                            className="relative group block"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {/* Glow effect */}
                                            <motion.div
                                                className="absolute -inset-1 rounded-2xl blur-lg transition-opacity duration-300"
                                                style={{ background: card.glowColor }}
                                                animate={{ opacity: isActive ? 1 : 0 }}
                                            />

                                            {/* Card */}
                                            <div className={`relative bg-card/90 backdrop-blur-xl border rounded-2xl p-5 w-[220px] min-w-[220px] transition-all duration-300 ${isActive ? "border-white/30 bg-card" : "border-border/50"}`}>
                                                {/* Gradient overlay */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />

                                                {/* Shine effect */}
                                                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                                                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                                                </div>

                                                <div className="relative z-10 flex flex-col items-center text-center gap-3">
                                                    {/* Icon */}
                                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                                                        {card.icon}
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="text-sm font-semibold text-foreground leading-tight">
                                                        {card.title}
                                                    </h3>

                                                    {/* Description */}
                                                    <p className="text-xs text-muted-foreground leading-snug">
                                                        {card.description}
                                                    </p>

                                                    {/* Missing Compat Badge */}
                                                    {card.id === "compatibility" && missingCompatCount > 0 && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="absolute -top-2 -right-2 bg-orange-500 text-orange-950 text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-2 shadow-lg"
                                                        >
                                                            <motion.span
                                                                animate={{ scale: [1, 1.1, 1] }}
                                                                transition={{ repeat: Infinity, duration: 2 }}
                                                            >
                                                                {missingCompatCount}
                                                            </motion.span>
                                                        </motion.div>
                                                    )}

                                                    {/* Pending Badge for Builds */}
                                                    {card.id === "builds" && pendingBuildsCount > 0 && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-950 text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-2 shadow-lg"
                                                        >
                                                            <motion.span
                                                                animate={{ scale: [1, 1.1, 1] }}
                                                                transition={{ repeat: Infinity, duration: 2 }}
                                                            >
                                                                {pendingBuildsCount}
                                                            </motion.span>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
