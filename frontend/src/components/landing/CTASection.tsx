"use client"

import { Button } from "@/components/ui/button"
import {
    ContainerAnimated,
    ContainerStagger,
    GalleryGrid,
    GalleryGridCell,
} from "@/components/ui/cta-section-with-gallery"

const IMAGES = [
    "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=2487&auto=format&fit=crop", // RGB Gaming PC
    "https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=2487&auto=format&fit=crop", // Custom PC Build
    "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2487&auto=format&fit=crop", // Gaming Setup
    "https://images.unsplash.com/photo-1555617981-dac3880eac6e?q=80&w=2487&auto=format&fit=crop", // PC Components
]

export function CTASection() {
    return (
        <section className="py-32 relative overflow-hidden">
            <div className="container relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-8 md:grid-cols-2">
                <ContainerStagger>
                    <ContainerAnimated className="mb-6 flex items-center gap-3">
                        <div className="h-px w-12 bg-primary" />
                        <span className="text-sm font-medium tracking-wide text-primary">
                            Build Smarter, Save More
                        </span>
                    </ContainerAnimated>
                    <ContainerAnimated className="text-4xl font-bold md:text-5xl leading-[1.1] tracking-tight mb-6">
                        Ready to Build Your Dream PC?
                    </ContainerAnimated>
                    <ContainerAnimated className="text-base text-muted-foreground md:text-lg leading-relaxed max-w-lg mb-8">
                        Join thousands of Bangladeshi builders who are saving money and building smarter rigs with RigForgeBD.
                        Compare prices, plan your build, and get expert recommendations.
                    </ContainerAnimated>
                    <ContainerAnimated>
                        <Button size="lg" className="h-12 px-8 text-base rounded-lg font-semibold">
                            Start Building Now
                        </Button>
                    </ContainerAnimated>
                </ContainerStagger>

                <GalleryGrid>
                    {IMAGES.map((imageUrl, index) => (
                        <GalleryGridCell index={index} key={index}>
                            <img
                                className="size-full object-cover object-center"
                                width="100%"
                                height="100%"
                                src={imageUrl}
                                alt={`PC Build ${index + 1}`}
                            />
                        </GalleryGridCell>
                    ))}
                </GalleryGrid>
            </div>
        </section>
    )
}
