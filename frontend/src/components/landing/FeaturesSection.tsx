import { BarChart3, CheckCircle2, Users, Cpu, Globe } from "lucide-react"
import { BentoCard, BentoGrid, type BentoCardProps } from "@/components/ui/bento-grid"
import Image from "next/image"
import { ReactNode } from "react"

/**
 * Standard opacity value for feature card backgrounds
 */
const CARD_IMAGE_OPACITY = "opacity-70 dark:opacity-60" as const

/**
 * Feature background wrapper component
 */
const FeatureBackground = ({
    src,
    alt
}: {
    src: string;
    alt: string;
}) => (
    <>
        <Image
            src={src}
            alt={alt}
            fill
            className={`object-cover ${CARD_IMAGE_OPACITY}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/95 via-card/70 to-secondary/90 dark:from-card/80 dark:via-card/40 dark:to-card/80" />
    </>
)

/**
 * Features configuration for the RigForgeBD platform
 */
const features: BentoCardProps[] = [
    {
        Icon: CheckCircle2,
        name: "Compatibility Check",
        description:
            "Our intelligent engine checks for physical dimensions, power constraints, and socket matches.",
        href: "#compatibility",
        cta: "How It Works",
        background: (
            <FeatureBackground
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop"
                alt="Circuit board representing compatibility checking technology"
            />
        ),
        className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
    },
    {
        Icon: Cpu,
        name: "Localized Pricing",
        description:
            "Get real-time price updates from top Bangladeshi retailers like Star Tech, Ryans, Techland, and more.",
        href: "#pricing",
        cta: "View Retailers",
        background: (
            <FeatureBackground
                src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop"
                alt="AMD Ryzen processor showing localized pricing features"
            />
        ),
        className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
    },
    {
        Icon: Globe,
        name: "Bangladesh First",
        description: "Built specifically for the Bangladeshi PC building community.",
        href: "#about",
        cta: "Our Mission",
        background: (
            <FeatureBackground
                src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop"
                alt="Digital technology representing Bangladesh-first approach"
            />
        ),
        className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2",
    },
    {
        Icon: BarChart3,
        name: "Price Comparison",
        description: "Compare prices across multiple retailers at a glance.",
        href: "#compare",
        cta: "Compare Now",
        background: (
            <FeatureBackground
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop"
                alt="Analytics dashboard showing price comparison features"
            />
        ),
        className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
    },
    {
        Icon: Users,
        name: "Community Driven",
        description:
            "Get feedback on your build list from experienced builders. Share your completed rig and inspire others.",
        href: "#community",
        cta: "Join Community",
        background: (
            <FeatureBackground
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop"
                alt="Team collaboration representing community-driven features"
            />
        ),
        className: "lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-4",
    },
]

/**
 * FeaturesSection - Main features showcase for RigForgeBD platform
 * 
 * Displays 5 key platform features in a responsive Bento Grid layout:
 * - Compatibility Check
 * - Localized Pricing
 * - Bangladesh First
 * - Price Comparison
 * - Community Driven
 * 
 * The section uses Next.js Image optimization for better performance
 * and includes full accessibility support.
 */
export function FeaturesSection() {
    return (
        <section
            className="py-20 bg-muted/50 dark:bg-accent"
            aria-labelledby="features-heading"
        >
            <div className="container px-4 md:px-6">
                <div className="text-center mb-16 space-y-4">
                    <h2
                        id="features-heading"
                        className="text-3xl font-bold tracking-tight md:text-4xl text-foreground"
                    >
                        Why Use RigForgeBD?
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        We simplify the chaotic process of PC building in Bangladesh by bringing everything you need into one sleek platform.
                    </p>
                </div>

                <BentoGrid className="lg:grid-rows-3">
                    {features.map((feature) => (
                        <BentoCard key={feature.name} {...feature} />
                    ))}
                </BentoGrid>
            </div>
        </section>
    )
}
