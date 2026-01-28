import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const BUILDS_DIR = path.join(os.homedir(), "Desktop", "RigForgeBuilds")
const BUILDS_FILE = path.join(BUILDS_DIR, "builds.json")

interface CommentData {
    id: string
    buildId: string
    authorId: string
    authorUsername: string
    authorAvatar?: string
    content: string
    createdAt: string
}

interface BuildData {
    id: string
    commentsEnabled: boolean
    commentCount: number
    comments: CommentData[]
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

// GET /api/builds/[id]/comments - Get all comments for a build
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

        return NextResponse.json(build.comments || [])
    } catch (error) {
        console.error("Error fetching comments:", error)
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
    }
}

// POST /api/builds/[id]/comments - Add a comment to a build
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { author, content } = await request.json()

        if (!author?.id || !author?.username || !content) {
            return NextResponse.json({ error: "Invalid comment data" }, { status: 400 })
        }

        const builds = await readBuilds()
        const buildIndex = builds.findIndex((b) => b.id === id)

        if (buildIndex === -1) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        const build = builds[buildIndex]

        if (!build.commentsEnabled) {
            return NextResponse.json({ error: "Comments are disabled for this build" }, { status: 403 })
        }

        const newComment: CommentData = {
            id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            buildId: id,
            authorId: author.id,
            authorUsername: author.username,
            authorAvatar: author.avatarUrl,
            content,
            createdAt: new Date().toISOString(),
        }

        if (!build.comments) {
            build.comments = []
        }
        build.comments.push(newComment)
        build.commentCount = build.comments.length

        builds[buildIndex] = build
        await writeBuilds(builds)

        return NextResponse.json(newComment, { status: 201 })
    } catch (error) {
        console.error("Error adding comment:", error)
        return NextResponse.json({ error: "Failed to add comment" }, { status: 500 })
    }
}
