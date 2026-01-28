"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { Plus, Cpu } from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { BuildsGrid } from "@/components/builds"
import { Build, BuildsFilter } from "@/components/builds/types"
import { getBuilds, getFeaturedBuilds, voteBuild } from "@/lib/buildsApi"

export default function BuildsPage() {
    const { user } = useUser()
    const [builds, setBuilds] = useState<Build[]>([])
    const [featuredBuilds, setFeaturedBuilds] = useState<Build[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<BuildsFilter>({ sortBy: "newest" })
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)

    const loadBuilds = useCallback(async () => {
        setIsLoading(true)
        try {
            const userEmail = user?.primaryEmailAddress?.emailAddress
            const [buildsData, featuredData] = await Promise.all([
                getBuilds(filter, page, 12, userEmail),
                page === 1 ? getFeaturedBuilds(6, userEmail) : Promise.resolve([]),
            ])

            setBuilds(buildsData.builds)
            setTotal(buildsData.total)

            if (page === 1) {
                setFeaturedBuilds(featuredData)
            }
        } catch (error) {
            console.error("Failed to load builds:", error)
        } finally {
            setIsLoading(false)
        }
    }, [filter, page, user])

    useEffect(() => {
        loadBuilds()
    }, [loadBuilds])

    const handleFilterChange = (newFilter: BuildsFilter) => {
        setFilter(newFilter)
        setPage(1)
    }

    const handleVote = async (buildId: string, voteType: "upvote" | "downvote") => {
        if (!user) return

        const email = user.primaryEmailAddress?.emailAddress
        if (!email) {
            console.error("User email not found")
            return
        }

        try {
            const updatedBuild = await voteBuild(buildId, email, voteType)

            // Update in builds list
            setBuilds((prev) =>
                prev.map((b) => (b.id === buildId ? updatedBuild : b))
            )

            // Update in featured builds if present
            setFeaturedBuilds((prev) =>
                prev.map((b) => (b.id === buildId ? updatedBuild : b))
            )
        } catch (error) {
            console.error("Failed to vote:", error)
        }
    }

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background">
                {/* Hero Section */}
                <section className="relative py-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                    <div className="container px-4 md:px-6 relative">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center max-w-3xl mx-auto"
                        >
                            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                                <Cpu className="h-4 w-4" />
                                Community Builds
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                Discover Amazing{" "}
                                <span className="text-primary">PC Builds</span>
                            </h1>
                            <p className="text-lg text-muted-foreground mb-8">
                                Get inspired by builds from our Bangladeshi community. See what
                                others are building, share your own rig, and help others with
                                your experience.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/builds/publish">
                                    <Button size="lg" className="gap-2">
                                        <Plus className="h-5 w-5" />
                                        Share Your Build
                                    </Button>
                                </Link>
                                <Link href="/builder">
                                    <Button variant="outline" size="lg" className="gap-2">
                                        <Cpu className="h-5 w-5" />
                                        Start Building
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Builds Grid */}
                <section className="container px-4 md:px-6 pb-16">
                    <BuildsGrid
                        builds={builds}
                        featuredBuilds={featuredBuilds}
                        isLoading={isLoading}
                        currentFilter={filter}
                        onFilterChange={handleFilterChange}
                        onVote={handleVote}
                    />

                    {/* Load More */}
                    {builds.length < total && !isLoading && (
                        <div className="flex justify-center mt-8">
                            <Button
                                variant="outline"
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Load More Builds
                            </Button>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    )
}
