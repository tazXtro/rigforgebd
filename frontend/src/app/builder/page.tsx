import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { PCBuilder } from "@/components/builder"
import { BuilderProvider } from "@/contexts/BuilderContext"

export default function BuilderPage() {
  return (
    <BuilderProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        
        <main className="flex-1">
          <PCBuilder />
        </main>

        <Footer />
      </div>
    </BuilderProvider>
  )
}
