import { cn } from "@/lib/utils";

interface GradientGridBgProps {
    className?: string;
    variant?: "dual-corner" | "right-corner";
    gridSize?: number;
    gradientColor?: string;
    gridColor?: string;
}

/**
 * Gradient Grid Background Component
 * 
 * A decorative background component that displays a grid pattern with gradient overlays.
 * Can be used as an absolute positioned background layer.
 * 
 * @param variant - "dual-corner" for gradients in both corners, "right-corner" for single gradient
 * @param gridSize - Size of grid cells in pixels (default: 20)
 * @param gradientColor - Color of the gradient overlay (default: theme-aware orange/primary)
 * @param gridColor - Color of the grid lines (default: theme-aware rgba colors)
 */
export function GradientGridBg({
    className,
    variant = "dual-corner",
    gridSize = 20,
    gradientColor,
    gridColor,
}: GradientGridBgProps) {
    const gradientStyles =
        variant === "dual-corner"
            ? {
                backgroundImage: `
            linear-gradient(to right, ${gridColor || "rgba(0, 0, 0, 0.05)"} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor || "rgba(0, 0, 0, 0.05)"} 1px, transparent 1px),
            radial-gradient(circle 600px at 0% 200px, ${gradientColor || "rgba(255, 140, 66, 0.12)"}, transparent),
            radial-gradient(circle 600px at 100% 200px, ${gradientColor || "rgba(255, 140, 66, 0.12)"}, transparent)
          `,
                backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, 100% 100%, 100% 100%`,
            }
            : {
                backgroundImage: `
            linear-gradient(to right, ${gridColor || "rgba(0, 0, 0, 0.05)"} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor || "rgba(0, 0, 0, 0.05)"} 1px, transparent 1px),
            radial-gradient(circle 800px at 100% 200px, ${gradientColor || "rgba(255, 140, 66, 0.12)"}, transparent)
          `,
                backgroundSize: `96px 64px, 96px 64px, 100% 100%`,
            };

    return (
        <div
            className={cn("absolute inset-0 z-0", className)}
            style={gradientStyles}
            aria-hidden="true"
        />
    );
}
