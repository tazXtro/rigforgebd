import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const BUILDS_DIR = path.join(os.homedir(), "Desktop", "RigForgeBuilds")
const BUILDS_FILE = path.join(BUILDS_DIR, "builds.json")

interface BuildData {
    id: string
    isFeatured: boolean
    createdAt: string
    votes: unknown[]
    comments: unknown[]
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

// GET /api/builds/featured - Get featured builds
export async function GET() {
    try {
        const builds = await readBuilds()
        const featuredBuilds = builds
            .filter((b) => b.isFeatured)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6)
            .map(({ votes, comments, ...rest }) => rest)

        return NextResponse.json(featuredBuilds)
    } catch (error) {
        console.error("Error fetching featured builds:", error)
        return NextResponse.json({ error: "Failed to fetch featured builds" }, { status: 500 })
    }
}
