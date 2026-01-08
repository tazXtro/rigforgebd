"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { RainingLetters, ScrambledTitle } from "@/components/ui/modern-animated-hero-section"
import { ShaderAnimation } from "@/components/ui/shader-lines"

const stats = [
    { value: "5K+", label: "Parts Database" },
    { value: "50+", label: "Local Retailers" },
    { value: "10K+", label: "Builds Created" },
    { value: "Active", label: "Community" },
]

export function HeroSection() {
    return (
        <section className="relative overflow-hidden py-20 md:py-28 lg:py-36">
            {/* Layered Animated Background */}
            {/* Base Layer: Shader Animation */}
            <div className="absolute inset-0 z-0">
                <ShaderAnimation />
            </div>

            {/* Top Layer: Raining Letters with transparency */}
            <div className="absolute inset-0 z-[0.5] opacity-60 mix-blend-screen">
                <RainingLetters />
            </div>

            {/* Gradient Overlay - stronger at bottom for section separation */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/85 via-background/70 to-background" />

            {/* Smooth bottom fade for seamless transition */}
            <div className="absolute bottom-0 left-0 right-0 h-24 z-[2] bg-gradient-to-t from-background via-background/80 to-transparent" />

            {/* Main Content */}
            <div className="container relative z-10 px-4 md:px-6">
                <div className="flex flex-col items-center gap-6 text-center">
                    {/* Badge */}
                    <Badge
                        variant="outline"
                        className="px-3 py-1 text-sm border-primary/20 bg-primary/5 text-primary"
                    >
                        v1.0 is now live! 🚀
                    </Badge>

                    {/* Title & Description */}
                    <div className="space-y-4 max-w-2xl">
                        <ScrambledTitle />
                        <p className="mx-auto max-w-[600px] text-muted-foreground text-base md:text-lg">
                            The ultimate PC building platform for Bangladesh.
                            Compare prices, check compatibility, and build with confidence.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button size="lg" className="h-11 px-6 text-base shadow-md hover:shadow-lg transition-all">
                            Start Your Build <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-11 px-6 text-base shadow-sm hover:shadow-md transition-all"
                        >
                            View Completed Builds
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="flex flex-col items-center gap-1">
                                <span className="font-bold text-xl md:text-2xl text-foreground">
                                    {stat.value}
                                </span>
                                <span className="text-muted-foreground text-xs md:text-sm">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
