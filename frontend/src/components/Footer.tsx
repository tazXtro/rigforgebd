import Link from "next/link"
import { Facebook, Twitter, Instagram, Github, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import { RetailerCloud } from "@/components/ui/retailer-cloud"

const localRetailers = [
    "Ryans Computers",
    "Star Tech",
    "TechLand",
    "UCC",
    "Global Brand",
    "Computer Source",
    "Skyland",
    "Ultratech",
];

export default function Footer() {
    return (
        <footer className="relative w-full bg-muted/30 border-t overflow-hidden">
            {/* Subtle dot pattern overlay */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `radial-gradient(circle, hsl(var(--foreground) / 0.05) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                }}
            />

            <div className="container relative px-4 md:px-6 py-12">
                {/* Local Retailers Section */}
                <div className="mb-10">
                    <h2 className="mb-6 text-center font-medium text-muted-foreground text-sm tracking-tight">
                        Featured Local Retailers
                    </h2>
                    <RetailerCloud retailers={localRetailers} />
                </div>

                {/* Separator */}
                <div
                    aria-hidden="true"
                    className={cn(
                        "mx-auto my-8 h-px max-w-4xl bg-border",
                        "[mask-image:linear-gradient(to_right,transparent,black,transparent)]"
                    )}
                />

                {/* Stacked Circular Footer Content */}
                <div className="flex flex-col items-center mt-8">
                    {/* Logo Circle */}
                    <div className="mb-8 rounded-full bg-primary/10 p-8">
                        <Cpu className="h-12 w-12 text-primary" />
                    </div>

                    {/* Navigation Links */}
                    <nav className="mb-8 flex flex-wrap justify-center gap-6 text-sm">
                        <Link href="/builder" className="hover:text-primary transition-colors">
                            System Builder
                        </Link>
                        <Link href="/builds" className="hover:text-primary transition-colors">
                            Completed Builds
                        </Link>
                        <Link href="/products" className="hover:text-primary transition-colors">
                            Browse Products
                        </Link>
                        <Link href="/guides" className="hover:text-primary transition-colors">
                            Guides
                        </Link>
                        <Link href="/about" className="hover:text-primary transition-colors">
                            About
                        </Link>
                        <Link href="/contact" className="hover:text-primary transition-colors">
                            Contact
                        </Link>
                    </nav>

                    {/* Social Media Buttons */}
                    <div className="mb-8 flex space-x-4">
                        <Link
                            href="#"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <Facebook className="h-4 w-4" />
                            <span className="sr-only">Facebook</span>
                        </Link>
                        <Link
                            href="#"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <Twitter className="h-4 w-4" />
                            <span className="sr-only">Twitter</span>
                        </Link>
                        <Link
                            href="#"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <Instagram className="h-4 w-4" />
                            <span className="sr-only">Instagram</span>
                        </Link>
                        <Link
                            href="#"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            <span className="sr-only">GitHub</span>
                        </Link>
                    </div>

                    {/* Newsletter Subscription - Optional, can be removed if not needed */}
                    {/* Uncomment if you want newsletter functionality
                    <div className="mb-8 w-full max-w-md">
                        <form className="flex space-x-2">
                            <div className="flex-grow">
                                <Label htmlFor="email" className="sr-only">Email</Label>
                                <Input
                                    id="email"
                                    placeholder="Enter your email"
                                    type="email"
                                    className="rounded-full"
                                />
                            </div>
                            <Button type="submit" className="rounded-full">
                                Subscribe
                            </Button>
                        </form>
                    </div>
                    */}

                    {/* Copyright */}
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} RigForgeBD. All rights reserved.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Made with <span className="text-red-500">❤️</span> for BD Gamers
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
