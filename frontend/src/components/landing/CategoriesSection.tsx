"use client"

import Link from "next/link"
import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { Cpu, Gpu, CircuitBoard, MemoryStick, HardDrive, BatteryCharging, Box, Fan, Monitor, Headphones, Laptop, PcCase, type LucideIcon } from "lucide-react"
import { useState } from "react"

interface Category {
    name: string
    icon: LucideIcon
    slug: string
}

const categories: Category[] = [
    { name: "Processors", icon: Cpu, slug: "processors" },
    { name: "Graphics Cards", icon: Gpu, slug: "graphics-cards" },
    { name: "Motherboards", icon: CircuitBoard, slug: "motherboards" },
    { name: "Memory", icon: MemoryStick, slug: "memory" },
    { name: "Storage", icon: HardDrive, slug: "storage" },
    { name: "Power Supply", icon: BatteryCharging, slug: "power-supply" },
    { name: "Cases", icon: Box, slug: "cases" },
    { name: "Cooling", icon: Fan, slug: "cooling" },
    { name: "Monitors", icon: Monitor, slug: "monitors" },
    { name: "Accessories", icon: Headphones, slug: "accessories" },
    { name: "Laptops", icon: Laptop, slug: "laptops" },
    { name: "Pre-builts", icon: PcCase, slug: "pre-builts" },
]

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04,
            delayChildren: 0.15,
        },
    },
}

const itemVariants = {
    hidden: {
        opacity: 0,
        y: 30,
        scale: 0.8,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 120,
            damping: 14,
            mass: 0.8,
        },
    },
}

function CategoryCard({ category }: { category: Category }) {
    const [isHovered, setIsHovered] = useState(false)

    // Mouse position tracking for tilt effect
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Spring animation for smooth tilt
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 20 })
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 20 })

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const mouseXPos = (e.clientX - centerX) / (rect.width / 2)
        const mouseYPos = (e.clientY - centerY) / (rect.height / 2)

        mouseX.set(mouseXPos)
        mouseY.set(mouseYPos)
    }

    const handleMouseLeave = () => {
        setIsHovered(false)
        mouseX.set(0)
        mouseY.set(0)
    }

    return (
        <motion.div
            variants={itemVariants}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            whileHover={{
                z: 50,
                transition: { type: "spring" as const, stiffness: 300, damping: 20 }
            }}
            className="group perspective-1000"
        >
            <Link href={`/products/${category.slug}`}>
                <Card className="relative h-full overflow-hidden border-2 border-border/50 transition-all duration-500 bg-card hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                    {/* Decorative corner dots - top left */}
                    <div className="absolute top-3 left-3 flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                        <motion.div
                            className="w-1 h-1 rounded-full bg-primary"
                            animate={isHovered ? { scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div
                            className="w-1 h-1 rounded-full bg-primary"
                            animate={isHovered ? { scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] } : {}}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                        />
                    </div>

                    {/* Decorative corner dots - bottom right */}
                    <div className="absolute bottom-3 right-3 flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                        <motion.div
                            className="w-1 h-1 rounded-full bg-primary"
                            animate={isHovered ? { scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] } : {}}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                        />
                        <motion.div
                            className="w-1 h-1 rounded-full bg-primary"
                            animate={isHovered ? { scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] } : {}}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                        />
                    </div>

                    {/* Animated border accent */}
                    <motion.div
                        className="absolute bottom-0 left-0 h-0.5 bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: isHovered ? "100%" : 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />

                    <CardContent className="relative flex flex-col items-center justify-center p-8 gap-4 z-10">
                        {/* Icon container with background circle */}
                        <motion.div
                            className="relative"
                            animate={{
                                y: isHovered ? -4 : 0,
                            }}
                            transition={{ type: "spring" as const, stiffness: 400, damping: 17 }}
                        >
                            {/* Background circle */}
                            <motion.div
                                className="absolute inset-0 -m-3 rounded-full border-2 border-primary/20"
                                animate={{
                                    scale: isHovered ? [1, 1.1, 1] : 1,
                                    borderColor: isHovered ? "rgba(var(--primary-rgb), 0.4)" : "rgba(var(--primary-rgb), 0.2)",
                                }}
                                transition={{ duration: 0.6 }}
                            />

                            <motion.div
                                animate={{
                                    rotate: isHovered ? 360 : 0,
                                }}
                                transition={{
                                    duration: 0.6,
                                    ease: "easeInOut"
                                }}
                            >
                                <category.icon
                                    className="h-9 w-9 text-muted-foreground group-hover:text-primary transition-colors duration-300 relative z-10"
                                    strokeWidth={1.5}
                                />
                            </motion.div>
                        </motion.div>

                        {/* Category name */}
                        <motion.span
                            className="font-medium text-sm text-center tracking-wide group-hover:text-primary transition-colors duration-300"
                            animate={{
                                y: isHovered ? -2 : 0,
                            }}
                            transition={{ type: "spring" as const, stiffness: 400, damping: 17 }}
                        >
                            {category.name}
                        </motion.span>

                        {/* Hover indicator */}
                        <motion.div
                            className="h-0.5 bg-primary rounded-full"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{
                                width: isHovered ? "60%" : 0,
                                opacity: isHovered ? 1 : 0,
                            }}
                            transition={{ duration: 0.3 }}
                        />
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    )
}

export function CategoriesSection() {
    return (
        <section className="relative py-24 bg-muted/30">
            <div className="container px-4 md:px-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="text-center mb-16 space-y-4"
                >
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Browse Components
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                        Discover the perfect components for your dream build
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 md:gap-6"
                >
                    {categories.map((category) => (
                        <CategoryCard key={category.slug} category={category} />
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
