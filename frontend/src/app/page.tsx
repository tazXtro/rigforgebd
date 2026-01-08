import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import {
  HeroSection,
  FeaturesSection,
  FeaturedBuildsSection,
  CategoriesSection,
  CTASection,
} from "@/components/landing"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <FeaturedBuildsSection />
        <CategoriesSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  )
}
