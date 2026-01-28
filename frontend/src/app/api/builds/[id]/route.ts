import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const BUILDS_DIR = path.join(os.homedir(), "Desktop", "RigForgeBuilds")
const BUILDS_FILE = path.join(BUILDS_DIR, "builds.json")

interface BuildData {
    id: string
    title: string
    description: string
    imageUrl: string
    buildDate: string
    createdAt: string
    updatedAt?: string
    author: {
        id: string
        username: string
        avatarUrl?: string
    }
    components: unknown[]
    totalPrice: number
    isFeatured: boolean
    commentsEnabled: boolean
    upvotes: number
    downvotes: number
    commentCount: number
    votes: Array<{ id: string; userId: string; type: "upvote" | "downvote"; createdAt: string }>
    comments: Array<{
        id: string
        buildId: string
        authorId: string
        authorUsername: string
        authorAvatar?: string
        content: string
        createdAt: string
    }>
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

// GET /api/builds/[id] - Get a single build
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const builds = await readBuilds()
        const build = builds.find((b) => b.id === id)

        if (!build) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        const { votes, comments, ...sanitizedBuild } = build
        return NextResponse.json(sanitizedBuild)
    } catch (error) {
        console.error("Error fetching build:", error)
        return NextResponse.json({ error: "Failed to fetch build" }, { status: 500 })
    }
}

// PATCH /api/builds/[id] - Update a build
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const builds = await readBuilds()
        const buildIndex = builds.findIndex((b) => b.id === id)

        if (buildIndex === -1) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        const updatedBuild = {
            ...builds[buildIndex],
            ...body,
            updatedAt: new Date().toISOString(),
        }

        builds[buildIndex] = updatedBuild
        await writeBuilds(builds)

        const { votes, comments, ...sanitizedBuild } = updatedBuild
        return NextResponse.json(sanitizedBuild)
    } catch (error) {
        console.error("Error updating build:", error)
        return NextResponse.json({ error: "Failed to update build" }, { status: 500 })
    }
}

// DELETE /api/builds/[id] - Delete a build
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const builds = await readBuilds()
        const buildIndex = builds.findIndex((b) => b.id === id)

        if (buildIndex === -1) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        builds.splice(buildIndex, 1)
        await writeBuilds(builds)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting build:", error)
        return NextResponse.json({ error: "Failed to delete build" }, { status: 500 })
    }
}
