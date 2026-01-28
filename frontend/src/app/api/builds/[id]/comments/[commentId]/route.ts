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

// DELETE /api/builds/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    try {
        const { id, commentId } = await params
        const builds = await readBuilds()
        const buildIndex = builds.findIndex((b) => b.id === id)

        if (buildIndex === -1) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        const build = builds[buildIndex]
        const commentIndex = build.comments?.findIndex((c) => c.id === commentId)

        if (commentIndex === undefined || commentIndex === -1) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 })
        }

        build.comments.splice(commentIndex, 1)
        build.commentCount = build.comments.length

        builds[buildIndex] = build
        await writeBuilds(builds)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting comment:", error)
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 })
    }
}
