"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, AlertCircle, Lock } from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BuildSystemView } from "@/components/builds/BuildSystemView"
import { Build } from "@/components/builds/types"
import { getBuildById } from "@/lib/buildsApi"

export default function BuildSystemBuilderPage() {
    const params = useParams()
    const buildId = params.id as string

    const [build, setBuild] = useState<Build | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadBuild() {
            if (!buildId) return

            try {
                const data = await getBuildById(buildId)
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
    }, [buildId])

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background py-8">
                <div className="container px-4 md:px-6">
                    {isLoading && (
                        <div className="max-w-[1600px] mx-auto">
                            <div className="animate-pulse space-y-6">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="h-8 w-64 bg-muted rounded" />
                                <div className="h-96 bg-muted rounded-lg" />
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
                        <div className="max-w-[1600px] mx-auto">
                            {/* Back Link */}
                            <Link
                                href={`/builds/${build.id}`}
                                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Build
                            </Link>

                            {/* Header */}
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold text-foreground">
                                        {build.title}
                                    </h1>
                                    <Badge variant="secondary" className="gap-1">
                                        <Lock className="h-3 w-3" />
                                        Read Only
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground">
                                    Viewing build by {build.author.username} • This build cannot be modified
                                </p>
                            </motion.div>

                            {/* System Builder View */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <BuildSystemView
                                    components={build.components}
                                    totalPrice={build.totalPrice}
                                />
                            </motion.div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    )
}
