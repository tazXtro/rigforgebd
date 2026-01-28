import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

// For testing: store builds in Desktop/RigForgeBuilds folder
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

async function ensureBuildsDir() {
    try {
        await fs.access(BUILDS_DIR)
    } catch {
        await fs.mkdir(BUILDS_DIR, { recursive: true })
    }
}

async function readBuilds(): Promise<BuildData[]> {
    await ensureBuildsDir()
    try {
        const data = await fs.readFile(BUILDS_FILE, "utf-8")
        return JSON.parse(data)
    } catch {
        return []
    }
}

async function writeBuilds(builds: BuildData[]) {
    await ensureBuildsDir()
    await fs.writeFile(BUILDS_FILE, JSON.stringify(builds, null, 2))
}

function generateId(): string {
    return `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// GET /api/builds - Get all builds with filtering
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get("page") || "1")
        const pageSize = parseInt(searchParams.get("pageSize") || "12")
        const sortBy = searchParams.get("sortBy") || "newest"
        const featured = searchParams.get("featured")
        const search = searchParams.get("search")

        let builds = await readBuilds()

        // Filter by featured
        if (featured === "true") {
            builds = builds.filter((b) => b.isFeatured)
        }

        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase()
            builds = builds.filter(
                (b) =>
                    b.title.toLowerCase().includes(searchLower) ||
                    b.description.toLowerCase().includes(searchLower) ||
                    b.author.username.toLowerCase().includes(searchLower)
            )
        }

        // Sort
        switch (sortBy) {
            case "popular":
                builds.sort((a, b) => b.commentCount - a.commentCount)
                break
            case "mostVoted":
                builds.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
                break
            case "newest":
            default:
                builds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }

        // Paginate
        const total = builds.length
        const startIndex = (page - 1) * pageSize
        const paginatedBuilds = builds.slice(startIndex, startIndex + pageSize)

        // Remove internal data (votes array, comments array) from response
        const sanitizedBuilds = paginatedBuilds.map(({ votes, comments, ...rest }) => rest)

        return NextResponse.json({
            builds: sanitizedBuilds,
            total,
            page,
            pageSize,
        })
    } catch (error) {
        console.error("Error fetching builds:", error)
        return NextResponse.json({ error: "Failed to fetch builds" }, { status: 500 })
    }
}

// POST /api/builds - Create a new build
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { title, description, imageUrl, buildDate, commentsEnabled, components, totalPrice, author } = body

        if (!title || !description || !imageUrl || !author) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const builds = await readBuilds()

        const newBuild: BuildData = {
            id: generateId(),
            title,
            description,
            imageUrl,
            buildDate: buildDate || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            author,
            components: components || [],
            totalPrice: totalPrice || 0,
            isFeatured: false,
            commentsEnabled: commentsEnabled !== false,
            upvotes: 0,
            downvotes: 0,
            commentCount: 0,
            votes: [],
            comments: [],
        }

        builds.push(newBuild)
        await writeBuilds(builds)

        const { votes, comments, ...sanitizedBuild } = newBuild
        return NextResponse.json(sanitizedBuild, { status: 201 })
    } catch (error) {
        console.error("Error creating build:", error)
        return NextResponse.json({ error: "Failed to create build" }, { status: 500 })
    }
}
