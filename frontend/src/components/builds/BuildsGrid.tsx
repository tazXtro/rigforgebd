"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, SlidersHorizontal, Star, TrendingUp, Clock, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BuildCard } from "./BuildCard"
import { Build, BuildsFilter } from "./types"
import { cn } from "@/lib/utils"

interface BuildsGridProps {
    builds: Build[]
    featuredBuilds?: Build[]
    isLoading?: boolean
    onFilterChange?: (filter: BuildsFilter) => void
    onVote?: (buildId: string, voteType: "upvote" | "downvote") => void
    currentFilter?: BuildsFilter
}

export function BuildsGrid({
    builds,
    featuredBuilds = [],
    isLoading,
    onFilterChange,
    onVote,
    currentFilter = { sortBy: "newest" },
}: BuildsGridProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [votingBuildId, setVotingBuildId] = useState<string | null>(null)

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        onFilterChange?.({ ...currentFilter, search: value })
    }

    const handleSortChange = (sortBy: string) => {
        onFilterChange?.({ ...currentFilter, sortBy: sortBy as BuildsFilter["sortBy"] })
    }

    const handleVote = async (buildId: string, voteType: "upvote" | "downvote") => {
        setVotingBuildId(buildId)
        await onVote?.(buildId, voteType)
        setVotingBuildId(null)
    }

    const getSortIcon = () => {
        switch (currentFilter.sortBy) {
            case "popular":
                return <TrendingUp className="h-4 w-4" />
            case "mostVoted":
                return <Star className="h-4 w-4" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    const getSortLabel = () => {
        switch (currentFilter.sortBy) {
            case "popular":
                return "Most Popular"
            case "mostVoted":
                return "Most Voted"
            default:
                return "Newest"
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    }

    return (
        <div className="space-y-8">
            {/* Featured Builds Section */}
            {featuredBuilds.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Star className="h-5 w-5 text-primary fill-primary" />
                        <h2 className="text-2xl font-bold">Featured Builds</h2>
                    </div>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {featuredBuilds.map((build) => (
                            <BuildCard
                                key={build.id}
                                build={build}
                                onVote={handleVote}
                                isVoting={votingBuildId === build.id}
                            />
                        ))}
                    </motion.div>
                </section>
            )}

            {/* All Builds Section */}
            <section>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold">Community Builds</h2>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 sm:flex-initial sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search builds..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    {getSortIcon()}
                                    <span className="hidden sm:inline">{getSortLabel()}</span>
                                    <SlidersHorizontal className="h-4 w-4 sm:hidden" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuRadioGroup
                                    value={currentFilter.sortBy}
                                    onValueChange={handleSortChange}
                                >
                                    <DropdownMenuRadioItem value="newest">
                                        <Clock className="h-4 w-4 mr-2" />
                                        Newest
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="popular">
                                        <TrendingUp className="h-4 w-4 mr-2" />
                                        Most Popular
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="mostVoted">
                                        <Star className="h-4 w-4 mr-2" />
                                        Most Voted
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-card border rounded-lg overflow-hidden animate-pulse"
                            >
                                <div className="aspect-[4/3] bg-muted" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                    <div className="h-3 bg-muted rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Builds Grid */}
                {!isLoading && builds.length > 0 && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {builds.map((build) => (
                            <BuildCard
                                key={build.id}
                                build={build}
                                onVote={handleVote}
                                isVoting={votingBuildId === build.id}
                            />
                        ))}
                    </motion.div>
                )}

                {/* Empty State */}
                {!isLoading && builds.length === 0 && (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                            <Filter className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No builds found</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {searchQuery
                                ? `No builds match "${searchQuery}". Try a different search term.`
                                : "Be the first to share your build with the community!"}
                        </p>
                    </div>
                )}
            </section>
        </div>
    )
}
