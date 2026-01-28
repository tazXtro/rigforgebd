"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { AlertCircle } from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { BuildDetail } from "@/components/builds"
import { Build } from "@/components/builds/types"
import { getBuildById } from "@/lib/buildsApi"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BuildDetailPage() {
    const params = useParams()
    const buildId = params.id as string
    const { user } = useUser()

    const [build, setBuild] = useState<Build | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadBuild() {
            if (!buildId) return

            try {
                const userEmail = user?.primaryEmailAddress?.emailAddress
                const data = await getBuildById(buildId, userEmail)
                if (data) {
                    setBuild(data)
                } else {
                    setError("Build not found")
                }
            } catch (err) {
                console.error("Failed to load build:", err)
                setError("Failed to load build")
            } finally {
                setIsLoading(false)
            }
        }

        loadBuild()
    }, [buildId, user])

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background py-8">
                <div className="container px-4 md:px-6">
                    {isLoading && (
                        <div className="max-w-6xl mx-auto">
                            {/* Loading skeleton */}
                            <div className="animate-pulse space-y-6">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="grid lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="aspect-video bg-muted rounded-xl" />
                                        <div className="space-y-3">
                                            <div className="h-8 bg-muted rounded w-3/4" />
                                            <div className="h-4 bg-muted rounded w-1/2" />
                                        </div>
                                        <div className="h-48 bg-muted rounded-lg" />
                                    </div>
                                    <div className="space-y-6">
                                        <div className="h-48 bg-muted rounded-lg" />
                                        <div className="h-32 bg-muted rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && !isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-md mx-auto text-center py-16"
                        >
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Build Not Found</h1>
                            <p className="text-muted-foreground mb-6">
                                The build you&apos;re looking for doesn&apos;t exist or has been
                                removed.
                            </p>
                            <Link href="/builds">
                                <Button>Browse All Builds</Button>
                            </Link>
                        </motion.div>
                    )}

                    {build && !isLoading && (
                        <BuildDetail build={build} onBuildUpdate={setBuild} />
                    )}
                </div>
            </main>
            <Footer />
        </>
    )
}
