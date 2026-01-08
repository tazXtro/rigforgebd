import { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * BentoGrid - A responsive grid layout optimized for feature cards
 * 
 * Automatically adjusts from 1 column on mobile to 3 columns on large screens
 * Each row has a fixed height of 22rem for visual consistency
 * 
 * @param children - BentoCard components to display in the grid
 * @param className - Additional CSS classes for customization
 */
const BentoGrid = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "grid w-full auto-rows-[22rem] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                className,
            )}
        >
            {children}
        </div>
    );
};

/**
 * Props for BentoCard component
 */
export interface BentoCardProps {
    /** Display name of the feature */
    name: string;
    /** Optional CSS classes for grid positioning and customization */
    className?: string;
    /** Background image and gradient overlay */
    background: ReactNode;
    /** Lucide icon component to display */
    Icon: React.ComponentType<{ className?: string }>;
    /** Feature description text */
    description: string;
    /** Link destination (use proper routes or # for anchors) */
    href: string;
    /** Call-to-action button text */
    cta: string;
}

/**
 * BentoCard - An interactive feature card with hover animations
 * 
 * Features:
 * - Responsive image background with gradient overlay
 * - Icon that scales down on hover
 * - CTA button that slides up on hover
 * - Full accessibility support with ARIA labels
 * - Dark mode support
 * 
 * @example
 * ```tsx
 * <BentoCard
 *   name="Feature Name"
 *   description="Feature description"
 *   Icon={CheckCircle2}
 *   href="/feature"
 *   cta="Learn More"
 *   background={<FeatureBackground src="..." alt="..." />}
 *   className="lg:col-span-2"
 * />
 * ```
 */
const BentoCard = ({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
}: BentoCardProps) => (
    <div
        className={cn(
            "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
            // light styles
            "bg-white border border-neutral-200/80 shadow-lg",
            // dark styles
            "transform-gpu dark:bg-neutral-900 dark:border-white/10 dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
            // Performance optimization
            "will-change-transform",
            className,
        )}
        role="article"
        aria-labelledby={`feature-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
        <div className="absolute inset-0 overflow-hidden">{background}</div>
        <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
            <div className="mb-2 h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-90" aria-hidden="true">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <h3
                id={`feature-${name.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-xl font-semibold text-neutral-900 dark:text-white"
            >
                {name}
            </h3>
            <p className="max-w-lg text-neutral-600 dark:text-neutral-400">{description}</p>
        </div>

        <div
            className={cn(
                "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
            )}
        >
            <Button variant="ghost" asChild size="sm" className="pointer-events-auto text-primary hover:text-primary">
                <a href={href} aria-label={`${cta} - ${name}`}>
                    {cta}
                    <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
            </Button>
        </div>
        <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
    </div>
);

export { BentoCard, BentoGrid };
