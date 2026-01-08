'use client';
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

type RetailerCloudProps = React.ComponentProps<"div"> & {
    retailers: string[];
};

export function RetailerCloud({ className, retailers, ...props }: RetailerCloudProps) {
    return (
        <div
            {...props}
            className={cn(
                "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
                className
            )}
        >
            <InfiniteSlider gap={48} reverse speed={80} speedOnHover={25}>
                {retailers.map((retailer) => (
                    <div
                        key={`retailer-${retailer}`}
                        className="flex items-center justify-center px-6 py-2 rounded-lg bg-muted/50 border border-border/50"
                    >
                        <span className="font-semibold text-sm text-foreground whitespace-nowrap">
                            {retailer}
                        </span>
                    </div>
                ))}
            </InfiniteSlider>
        </div>
    );
}
