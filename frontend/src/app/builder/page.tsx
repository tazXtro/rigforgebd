import { Metadata } from "next"
import { BuilderProvider, PCBuilder } from "@/components/builder"

export const metadata: Metadata = {
    title: "System Builder | RigForgeBD",
    description:
        "Build your custom PC with our system builder. Compare prices across Bangladeshi retailers and find the best deals on components.",
}

export default function BuilderPage() {
    return (
        <BuilderProvider>
            <main className="min-h-screen bg-background flex items-center justify-center">
                <PCBuilder />
            </main>
        </BuilderProvider>
    )
}
