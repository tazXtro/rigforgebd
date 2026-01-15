"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  MonitorPlay,
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Zap,
  Box,
  Fan,
  Monitor,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categories = [
  {
    name: "Graphics Cards",
    slug: "gpu",
    icon: MonitorPlay,
    description: "NVIDIA & AMD GPUs from RTX 4090 to budget options",
    available: true,
    count: "150+",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    name: "Processors",
    slug: "cpu",
    icon: Cpu,
    description: "Intel Core & AMD Ryzen processors",
    available: false,
    count: "Coming Soon",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    name: "Motherboards",
    slug: "motherboard",
    icon: CircuitBoard,
    description: "ATX, Micro-ATX & Mini-ITX boards",
    available: false,
    count: "Coming Soon",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    name: "Memory (RAM)",
    slug: "ram",
    icon: MemoryStick,
    description: "DDR4 & DDR5 memory modules",
    available: false,
    count: "Coming Soon",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    name: "Storage",
    slug: "storage",
    icon: HardDrive,
    description: "SSDs, NVMe drives & HDDs",
    available: false,
    count: "Coming Soon",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    name: "Power Supplies",
    slug: "psu",
    icon: Zap,
    description: "80+ certified PSUs from 500W to 1600W",
    available: false,
    count: "Coming Soon",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  {
    name: "Cases",
    slug: "case",
    icon: Box,
    description: "Tower cases for every build size",
    available: false,
    count: "Coming Soon",
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    name: "CPU Coolers",
    slug: "cooler",
    icon: Fan,
    description: "Air & liquid cooling solutions",
    available: false,
    count: "Coming Soon",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    name: "Monitors",
    slug: "monitor",
    icon: Monitor,
    description: "Gaming & professional displays",
    available: false,
    count: "Coming Soon",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Browse Components
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare prices from Techland, Startech and other top Bangladesh
            retailers. Find the best deals on PC components.
          </p>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            const content = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`group h-full transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm ${
                    category.available
                      ? "hover:shadow-lg hover:border-primary/50 cursor-pointer"
                      : "opacity-60"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3 rounded-xl ${category.color} transition-transform group-hover:scale-110`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge
                        variant={category.available ? "default" : "secondary"}
                        className={
                          category.available
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : ""
                        }
                      >
                        {category.count}
                      </Badge>
                    </div>

                    <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      {category.description}
                    </p>

                    {category.available && (
                      <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Browse Products
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );

            return category.available ? (
              <Link key={category.slug} href={`/products/${category.slug}`}>
                {content}
              </Link>
            ) : (
              <div key={category.slug}>{content}</div>
            );
          })}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-8 px-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Prices Updated Daily
              </h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Our prices are automatically scraped from retailer websites to
                ensure you always see the most current pricing. Last update
                check: Every 24 hours.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
