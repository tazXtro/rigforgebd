import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const BUILDS_DIR = path.join(os.homedir(), "Desktop", "RigForgeBuilds")
const BUILDS_FILE = path.join(BUILDS_DIR, "builds.json")

interface BuildData {
    id: string
    isFeatured: boolean
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

// PATCH /api/builds/[id]/featured - Toggle featured status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { featured } = await request.json()

        const builds = await readBuilds()
        const buildIndex = builds.findIndex((b) => b.id === id)

        if (buildIndex === -1) {
            return NextResponse.json({ error: "Build not found" }, { status: 404 })
        }

        builds[buildIndex].isFeatured = featured
        await writeBuilds(builds)

        const { votes, comments, ...sanitizedBuild } = builds[buildIndex] as BuildData & { votes: unknown[]; comments: unknown[] }
        return NextResponse.json(sanitizedBuild)
    } catch (error) {
        console.error("Error toggling featured:", error)
        return NextResponse.json({ error: "Failed to update featured status" }, { status: 500 })
    }
}
