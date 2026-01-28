"use client"

import { useUser, SignInButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { ArrowLeft, LogIn } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PublishBuildForm } from "@/components/builds"

export default function PublishBuildPage() {
    const { isSignedIn, isLoaded } = useUser()

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background py-8">
                <div className="container px-4 md:px-6 max-w-3xl mx-auto">
                    {/* Back Link */}
                    <Link
                        href="/builds"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Builds
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Publish Your Build</CardTitle>
                                <CardDescription>
                                    Share your PC build with the RigForgeBD community. Help others
                                    get inspired and learn from your experience!
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!isLoaded ? (
                                    // Loading state
                                    <div className="py-12 text-center">
                                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                        <p className="text-muted-foreground">Loading...</p>
                                    </div>
                                ) : !isSignedIn ? (
                                    // Not signed in
                                    <div className="py-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                            <LogIn className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">
                                            Sign in to Publish
                                        </h3>
                                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                            You need to be signed in to publish your build to the
                                            community.
                                        </p>
                                        <SignInButton mode="modal">
                                            <Button className="gap-2">
                                                <LogIn className="h-4 w-4" />
                                                Sign In
                                            </Button>
                                        </SignInButton>
                                    </div>
                                ) : (
                                    // Signed in - show form
                                    <PublishBuildForm />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Tips */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8"
                    >
                        <Card className="bg-muted/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Tips for a Great Build Post</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary font-bold">•</span>
                                        Use the System Builder to add your components before publishing
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary font-bold">•</span>
                                        Upload a clear photo of your completed build
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary font-bold">•</span>
                                        Include your budget and what you use the PC for
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary font-bold">•</span>
                                        Share any challenges you faced and how you solved them
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary font-bold">•</span>
                                        Mention which retailers you bought from in Bangladesh
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>
            <Footer />
        </>
    )
}
