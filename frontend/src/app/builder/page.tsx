import { Metadata } from "next"
import { PCBuilder } from "@/components/builder"
import Navbar from "@/components/Navbar"

export const metadata: Metadata = {
    title: "System Builder | RigForgeBD",
    description:
        "Build your custom PC with our system builder. Compare prices across Bangladeshi retailers and find the best deals on components.",
}

export default function BuilderPage() {
    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background">
                <PCBuilder />
            </main>
        </>
    )
}
