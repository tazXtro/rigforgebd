"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Menu, Cpu, Monitor, Users, Sun, Moon, X, Home } from "lucide-react"
import { useTheme } from "next-themes"
import {
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
} from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ProductsMegaMenu, ProductsNavTrigger, MobileProductsAccordion } from "@/components/ProductsMegaMenu"

// Reusable Tubelight Glow Effect Component
function TubelightGlow({ layoutId }: { layoutId: string }) {
    return (
        <motion.div
            layoutId={layoutId}
            className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
            initial={false}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
            }}
        >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
            </div>
        </motion.div>
    )
}

// Animated Theme Toggle with smooth icon rotation
function ThemeToggle({
    onHover,
    onLeave,
    isActive
}: {
    onHover: () => void
    onLeave: () => void
    isActive: boolean
}) {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    const toggleTheme = useCallback(() => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }, [resolvedTheme, setTheme])

    if (!mounted) {
        return (
            <div className="h-9 w-9 flex items-center justify-center rounded-full">
                <div className="h-4 w-4 bg-muted rounded-full animate-pulse" />
            </div>
        )
    }

    return (
        <button
            onClick={toggleTheme}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            className="relative h-9 w-9 flex items-center justify-center rounded-full text-foreground/60 hover:text-primary transition-colors"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
            {isActive && <TubelightGlow layoutId="tubelight-action" />}
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={resolvedTheme}
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {resolvedTheme === "dark" ? (
                        <Moon className="h-4 w-4" />
                    ) : (
                        <Sun className="h-4 w-4" />
                    )}
                </motion.div>
            </AnimatePresence>
        </button>
    )
}

// Expandable Search Component with better animations
function ExpandableSearch({
    isOpen,
    onToggle,
    onClose,
    onHover,
    onLeave,
    isActive,
}: {
    isOpen: boolean
    onToggle: () => void
    onClose: () => void
    onHover: () => void
    onLeave: () => void
    isActive: boolean
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            const timer = setTimeout(() => inputRef.current?.focus(), 100)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node) && isOpen) {
                onClose()
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen, onClose])

    // Close on Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isOpen) {
                onClose()
            }
        }
        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [isOpen, onClose])

    return (
        <div
            ref={containerRef}
            className="relative flex items-center"
            onMouseEnter={onHover}
            onMouseLeave={() => !isOpen && onLeave()}
        >
            <motion.div
                className="relative flex items-center overflow-hidden rounded-full"
                animate={{ width: isOpen ? 200 : 36 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
                {isActive && !isOpen && <TubelightGlow layoutId="tubelight-action" />}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="h-9 w-9 shrink-0 rounded-full hover:bg-transparent"
                    aria-label={isOpen ? "Close search" : "Open search"}
                    aria-expanded={isOpen}
                >
                    <motion.div
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isOpen ? (
                            <X className="h-4 w-4 text-foreground/60" />
                        ) : (
                            <Search className="h-4 w-4 text-foreground/60" />
                        )}
                    </motion.div>
                </Button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "100%" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="pr-2"
                        >
                            <Input
                                ref={inputRef}
                                type="search"
                                placeholder="Search..."
                                className="h-7 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                                aria-label="Search components"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}

// Navigation Link with Tubelight
function NavLink({
    href,
    label,
    icon: Icon,
    isActive,
    onClick,
}: {
    href: string
    label: string
    icon: React.ElementType
    isActive: boolean
    onClick: () => void
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-colors",
                "text-foreground/60 hover:text-primary",
                isActive && "text-primary"
            )}
        >
            <span className="flex items-center gap-1.5">
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <span className="hidden xl:inline">{label}</span>
            </span>
            {isActive && <TubelightGlow layoutId="tubelight-nav" />}
        </Link>
    )
}

// Action Link with Tubelight (for auth)
function ActionLink({
    href,
    label,
    onHover,
    onLeave,
    isActive,
}: {
    href: string
    label: string
    onHover: () => void
    onLeave: () => void
    isActive: boolean
}) {
    return (
        <Link
            href={href}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            className="relative px-4 py-2 text-sm font-medium text-foreground/60 hover:text-primary rounded-full transition-colors"
        >
            {isActive && <TubelightGlow layoutId="tubelight-action" />}
            {label}
        </Link>
    )
}

export default function Navbar() {
    const pathname = usePathname()
    const { resolvedTheme, setTheme } = useTheme()
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [activeAction, setActiveAction] = useState<string | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isProductsMenuOpen, setIsProductsMenuOpen] = useState(false)
    const productsButtonRef = useRef<HTMLButtonElement>(null)

    // Navigation links (excluding Products which has its own mega-menu)
    const navLinks = [
        { href: "/", label: "Home", icon: Home },
        { href: "/builder", label: "System Builder", icon: Cpu },
        { href: "/builds", label: "Builds", icon: Monitor },
        { href: "/community", label: "Community", icon: Users },
    ]

    const isProductsActive = pathname.startsWith("/products")

    const handleToggleProductsMenu = useCallback(() => {
        setIsProductsMenuOpen((prev) => !prev)
    }, [])

    const handleCloseProductsMenu = useCallback(() => {
        setIsProductsMenuOpen(false)
    }, [])

    // Determine active tab based on current pathname
    const getActiveTab = useCallback(() => {
        const match = navLinks.find((link) => {
            if (link.href === "/") return pathname === "/"
            return pathname.startsWith(link.href)
        })
        return match?.label || "Home"
    }, [pathname])

    const activeTab = getActiveTab()

    const handleCloseSearch = useCallback(() => setIsSearchOpen(false), [])
    const handleToggleSearch = useCallback(() => setIsSearchOpen((prev) => !prev), [])

    return (
        <header className="sticky top-0 z-50 w-full">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold text-xl tracking-tighter sm:text-2xl"
                    aria-label="RigForgeBD Home"
                >
                    <Cpu className="h-6 w-6 text-primary" aria-hidden="true" />
                    <span className="text-primary">RigForgeBD</span>
                </Link>

                {/* Tubelight 1: Main Navigation - Desktop */}
                <nav className="hidden lg:block relative" aria-label="Main navigation">
                    <div className="flex items-center gap-1 border border-border/30 backdrop-blur-lg py-1 px-1 rounded-full">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.href}
                                href={link.href}
                                label={link.label}
                                icon={link.icon}
                                isActive={activeTab === link.label}
                                onClick={() => { }}
                            />
                        ))}

                        {/* Products Mega Menu Trigger */}
                        <ProductsNavTrigger
                            isActive={isProductsActive}
                            isMenuOpen={isProductsMenuOpen}
                            onToggle={handleToggleProductsMenu}
                            triggerRef={productsButtonRef}
                        />
                    </div>

                    {/* Products Mega Menu Dropdown */}
                    <ProductsMegaMenu
                        isOpen={isProductsMenuOpen}
                        onClose={handleCloseProductsMenu}
                        triggerRef={productsButtonRef}
                    />
                </nav>

                {/* Tubelight 2: Actions - Desktop */}
                <div className="hidden md:block">
                    <div className="flex items-center gap-1 border border-border/30 backdrop-blur-lg py-1 px-1 rounded-full">
                        <ExpandableSearch
                            isOpen={isSearchOpen}
                            onToggle={handleToggleSearch}
                            onClose={handleCloseSearch}
                            onHover={() => setActiveAction("search")}
                            onLeave={() => setActiveAction(null)}
                            isActive={activeAction === "search"}
                        />

                        <ThemeToggle
                            onHover={() => setActiveAction("theme")}
                            onLeave={() => setActiveAction(null)}
                            isActive={activeAction === "theme"}
                        />

                        {/* Clerk Authentication */}
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button
                                    onMouseEnter={() => setActiveAction("login")}
                                    onMouseLeave={() => setActiveAction(null)}
                                    className="relative px-4 py-2 text-sm font-medium text-foreground/60 hover:text-primary rounded-full transition-colors"
                                >
                                    {activeAction === "login" && <TubelightGlow layoutId="tubelight-action" />}
                                    Log in
                                </button>
                            </SignInButton>

                            <SignUpButton mode="modal">
                                <button
                                    onMouseEnter={() => setActiveAction("signup")}
                                    onMouseLeave={() => setActiveAction(null)}
                                    className="relative px-4 py-2 text-sm font-medium text-foreground/60 hover:text-primary rounded-full transition-colors"
                                >
                                    {activeAction === "signup" && <TubelightGlow layoutId="tubelight-action" />}
                                    Sign up
                                </button>
                            </SignUpButton>
                        </SignedOut>

                        <SignedIn>
                            <div
                                className="relative px-2 py-1"
                                onMouseEnter={() => setActiveAction("user")}
                                onMouseLeave={() => setActiveAction(null)}
                            >
                                {activeAction === "user" && <TubelightGlow layoutId="tubelight-action" />}
                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: "h-8 w-8",
                                        },
                                    }}
                                />
                            </div>
                        </SignedIn>
                    </div>
                </div>

                {/* Mobile Menu */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="lg:hidden border-border/30 backdrop-blur-lg"
                            aria-label="Open menu"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                        <div className="flex flex-col gap-6 mt-6">
                            {/* Mobile Logo */}
                            <Link
                                href="/"
                                className="flex items-center gap-2 font-bold text-xl"
                                onClick={() => setIsSheetOpen(false)}
                            >
                                <Cpu className="h-6 w-6 text-primary" aria-hidden="true" />
                                <span className="text-primary">RigForgeBD</span>
                            </Link>

                            {/* Mobile Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <Input
                                    type="search"
                                    placeholder="Search..."
                                    className="w-full pl-10 h-10"
                                    aria-label="Search"
                                />
                            </div>

                            {/* Mobile Navigation */}
                            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                                {navLinks.map((link) => {
                                    const Icon = link.icon
                                    const isActive = activeTab === link.label
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsSheetOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                                isActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                            {link.label}
                                        </Link>
                                    )
                                })}
                            </nav>

                            {/* Mobile Products Accordion */}
                            <MobileProductsAccordion onClose={() => setIsSheetOpen(false)} />

                            {/* Mobile Theme Toggle */}
                            <Button
                                variant="outline"
                                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                                className="w-full justify-start gap-3 h-10"
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={resolvedTheme}
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {resolvedTheme === "dark" ? (
                                            <Moon className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <Sun className="h-4 w-4" aria-hidden="true" />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                                <span>{resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                            </Button>

                            {/* Mobile Auth */}
                            <div className="flex flex-col gap-2 pt-4 border-t border-border/30">
                                <SignedOut>
                                    <SignInButton mode="modal">
                                        <Button variant="outline" className="w-full h-10">
                                            Log in
                                        </Button>
                                    </SignInButton>
                                    <SignUpButton mode="modal">
                                        <Button className="w-full h-10">
                                            Sign up
                                        </Button>
                                    </SignUpButton>
                                </SignedOut>

                                <SignedIn>
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        <UserButton
                                            appearance={{
                                                elements: {
                                                    avatarBox: "h-9 w-9",
                                                },
                                            }}
                                        />
                                        <span className="text-sm text-foreground/70">Account</span>
                                    </div>
                                </SignedIn>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    )
}
