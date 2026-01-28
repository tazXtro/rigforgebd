import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const BUILDS_DIR = path.join(os.homedir(), "Desktop", "RigForgeBuilds")
const BUILDS_FILE = path.join(BUILDS_DIR, "builds.json")

interface BuildData {
    id: string
    upvotes: number
    downvotes: number
    votes: Array<{ id: string; userId: string; type: "upvote" | "downvote"; createdAt: string }>
    [key: string]: unknown
}

async function readBuilds(): Promise<BuildData[]> {
    try {
        const data = await fs.readFile(BUILDS_FILE, "utf-8")
        return JSON.parse(data)
    } catch {
        return []
    }
}

async function writeBuilds(builds: BuildData[]) {
    await fs.writeFile(BUILDS_FILE, JSON.stringify(builds, null, 2))
}

// POST /api/builds/[id]/vote - Vote on a build
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { userId, voteType } = await request.json()

        if (!userId || !voteType || !["upvote", "downvote"].includes(voteType)) {
            return NextResponse.json({ error: "Invalid vote data" }, { status: 400 })
        }

        const builds = await readBuilds()
        const buildIndex = builds.findIndex((b) => b.id === id)

        if (buildIndex === -1) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        const build = builds[buildIndex]
        const existingVoteIndex = build.votes.findIndex((v) => v.userId === userId)

        if (existingVoteIndex !== -1) {
            const existingVote = build.votes[existingVoteIndex]
            
            // If same vote type, remove it (toggle off)
            if (existingVote.type === voteType) {
                build.votes.splice(existingVoteIndex, 1)
                if (voteType === "upvote") {
                    build.upvotes = Math.max(0, build.upvotes - 1)
                } else {
                    build.downvotes = Math.max(0, build.downvotes - 1)
                }
            } else {
                // Change vote type
                if (existingVote.type === "upvote") {
                    build.upvotes = Math.max(0, build.upvotes - 1)
                    build.downvotes += 1
                } else {
                    build.downvotes = Math.max(0, build.downvotes - 1)
                    build.upvotes += 1
                }
                build.votes[existingVoteIndex].type = voteType
            }
        } else {
            // New vote
            build.votes.push({
                id: `vote_${Date.now()}`,
                userId,
                type: voteType,
                createdAt: new Date().toISOString(),
            })
            if (voteType === "upvote") {
                build.upvotes += 1
            } else {
                build.downvotes += 1
            }
        }

        builds[buildIndex] = build
        await writeBuilds(builds)

        // Get user's current vote
        const userVote = build.votes.find((v) => v.userId === userId)?.type || null

        const { votes, comments, ...sanitizedBuild } = build as BuildData & { comments: unknown[] }
        return NextResponse.json({ ...sanitizedBuild, userVote })
    } catch (error) {
        console.error("Error voting on build:", error)
        return NextResponse.json({ error: "Failed to vote on build" }, { status: 500 })
    }
}

// DELETE /api/builds/[id]/vote - Remove vote from a build
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        const builds = await readBuilds()
        const buildIndex = builds.findIndex((b) => b.id === id)

        if (buildIndex === -1) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        const build = builds[buildIndex]
        const voteIndex = build.votes.findIndex((v) => v.userId === userId)

        if (voteIndex !== -1) {
            const vote = build.votes[voteIndex]
            if (vote.type === "upvote") {
                build.upvotes = Math.max(0, build.upvotes - 1)
            } else {
                build.downvotes = Math.max(0, build.downvotes - 1)
            }
            build.votes.splice(voteIndex, 1)
        }

        builds[buildIndex] = build
        await writeBuilds(builds)

        const { votes, comments, ...sanitizedBuild } = build as BuildData & { comments: unknown[] }
        return NextResponse.json({ ...sanitizedBuild, userVote: null })
    } catch (error) {
        console.error("Error removing vote:", error)
        return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 })
    }
}
