'use client';

import { RadialScrollGallery } from "@/components/ui/radial-scroll-gallery"
import { Badge } from "@/components/ui/badge"
import { GradientGridBg } from "@/components/ui/gradient-grid-bg"
import { ArrowUpRight } from "lucide-react"

// PC Build showcase data with Unsplash images
const featuredBuilds = [
    {
        id: 1,
        name: "Aurora Gaming",
        specs: "Ryzen 7 7800X3D + RTX 4080",
        price: "৳ 285,000",
        category: "Gaming",
        builder: "TechMaster_BD",
        image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 2,
        name: "Creator Pro",
        specs: "Ryzen 9 7950X + RTX 4090",
        price: "৳ 425,000",
        category: "Workstation",
        builder: "BuilderPro",
        image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 3,
        name: "Budget Beast",
        specs: "Ryzen 5 7600 + RTX 4060 Ti",
        price: "৳ 145,000",
        category: "Budget",
        builder: "ValueKing",
        image: "https://images.unsplash.com/photo-1602524206684-7a8faa0c4b7e?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 4,
        name: "RGB Overdrive",
        specs: "Intel i7-14700K + RTX 4070 Ti",
        price: "৳ 265,000",
        category: "Gaming",
        builder: "RGB_Master",
        image: "https://images.unsplash.com/photo-1587202372583-49330a15584d?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 5,
        name: "Stealth Edition",
        specs: "Ryzen 7 7700X + RTX 4070",
        price: "৳ 215,000",
        category: "Premium",
        builder: "MinimalBuild",
        image: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 6,
        name: "Productivity Hub",
        specs: "Ryzen 9 7900X + RTX 4080",
        price: "৳ 335,000",
        category: "Workstation",
        builder: "WorkFlow_Pro",
        image: "https://images.unsplash.com/photo-1623403683894-34b6abcf5fc8?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 7,
        name: "Esports Ready",
        specs: "Intel i5-14600K + RTX 4060",
        price: "৳ 165,000",
        category: "Gaming",
        builder: "ProGamer_BD",
        image: "https://images.unsplash.com/photo-1586920029476-5a7df0be5d28?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 8,
        name: "Ultra Rig",
        specs: "Intel i9-14900K + RTX 4090",
        price: "৳ 465,000",
        category: "Premium",
        builder: "UltraBuilder",
        image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=400&q=80"
    },
]

export function FeaturedBuildsSection() {
    return (
        <section className="relative bg-background overflow-hidden">
            {/* Grid background for light mode */}
            <GradientGridBg
                variant="dual-corner"
                gridSize={20}
                gridColor="rgba(0, 0, 0, 0.06)"
                gradientColor="rgba(255, 140, 66, 0.15)"
                className="dark:hidden"
            />

            {/* Grid background for dark mode - more subtle */}
            <GradientGridBg
                variant="dual-corner"
                gridSize={20}
                gridColor="rgba(255, 255, 255, 0.03)"
                gradientColor="rgba(255, 140, 66, 0.08)"
                className="hidden dark:block"
            />

            {/* Smooth gradient transition from previous section */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />

            {/* Header area */}
            <div className="h-[280px] flex flex-col items-center justify-center space-y-6 pt-12 relative">
                <div className="space-y-2 text-center">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                        Community Builds
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Featured <span className="text-primary">Builds</span>
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Discover exceptional PC builds from our community
                    </p>
                </div>
                <div className="animate-bounce text-muted-foreground text-xs flex flex-col items-center gap-1">
                    <span>Scroll to explore</span>
                    <span>↓</span>
                </div>
            </div>

            {/* Radial scroll gallery */}
            <RadialScrollGallery
                className="!min-h-[600px]"
                baseRadius={450}
                mobileRadius={220}
                visiblePercentage={50}
                scrollDuration={2200}
            >
                {(hoveredIndex) =>
                    featuredBuilds.map((build, index) => {
                        const isActive = hoveredIndex === index;
                        return (
                            <div
                                key={build.id}
                                className="group relative w-[240px] h-[320px] sm:w-[280px] sm:h-[380px] overflow-hidden rounded-xl bg-card border border-border shadow-lg"
                            >
                                {/* Build image with overlay */}
                                <div className="absolute inset-0 overflow-hidden">
                                    <img
                                        src={build.image}
                                        alt={build.name}
                                        className={`h-full w-full object-cover transition-transform duration-700 ease-out ${isActive ? 'scale-110 blur-0' : 'scale-100 blur-[1px] grayscale-[20%]'
                                            }`}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
                                </div>

                                {/* Card content */}
                                <div className="absolute inset-0 flex flex-col justify-between p-4">
                                    {/* Top section: Badge and CTA icon */}
                                    <div className="flex justify-between items-start">
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] px-2 py-0.5 bg-background/80 backdrop-blur-sm border-border"
                                        >
                                            {build.category}
                                        </Badge>
                                        <div
                                            className={`w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all duration-500 ${isActive ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-45 scale-75'
                                                }`}
                                        >
                                            <ArrowUpRight size={14} strokeWidth={2.5} />
                                        </div>
                                    </div>

                                    {/* Bottom section: Build info */}
                                    <div className={`transition-all duration-500 ${isActive ? 'translate-y-0' : 'translate-y-2'}`}>
                                        <h3 className="text-xl sm:text-2xl font-bold leading-tight text-foreground mb-1">
                                            {build.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {build.specs}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-primary">
                                                {build.price}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                by {build.builder}
                                            </span>
                                        </div>
                                        {/* Accent bar */}
                                        <div
                                            className={`h-0.5 bg-primary mt-3 rounded-full transition-all duration-500 ${isActive ? 'w-full opacity-100' : 'w-0 opacity-0'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
            </RadialScrollGallery>

            {/* Footer spacing for scroll continuation */}
            <div className="h-[200px] flex items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Want to showcase your build?
                    </p>
                    <button className="text-primary hover:underline font-medium text-sm flex items-center gap-1 mx-auto">
                        Submit Your Build <ArrowUpRight className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Smooth gradient transition to next section */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>
    )
}
