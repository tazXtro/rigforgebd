"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Pencil,
    Check,
    X,
    Loader2,
    Plus,
    Trash2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface EditableSpecsProps {
    specs: Record<string, string>
    onSave: (specs: Record<string, string>) => Promise<{ error?: string }>
    editable?: boolean
}

export function EditableSpecs({ specs, onSave, editable = false }: EditableSpecsProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState<Array<{ key: string; value: string }>>(
        Object.entries(specs).map(([key, value]) => ({ key, value: String(value) }))
    )
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState("")

    const startEditing = () => {
        setDraft(Object.entries(specs).map(([key, value]) => ({ key, value: String(value) })))
        setIsEditing(true)
        setError("")
    }

    const handleCancel = () => {
        setIsEditing(false)
        setError("")
    }

    const handleSave = async () => {
        setIsSaving(true)
        setError("")
        const newSpecs: Record<string, string> = {}
        draft.forEach(({ key, value }) => {
            const k = key.trim()
            const v = value.trim()
            if (k && v) newSpecs[k] = v
        })
        const result = await onSave(newSpecs)
        setIsSaving(false)
        if (result.error) {
            setError(result.error)
        } else {
            setIsEditing(false)
        }
    }

    const updateRow = (index: number, field: "key" | "value", val: string) => {
        const updated = [...draft]
        updated[index][field] = val
        setDraft(updated)
    }

    const addRow = () => setDraft([...draft, { key: "", value: "" }])
    const removeRow = (index: number) => setDraft(draft.filter((_, i) => i !== index))

    // Read-only display
    if (!isEditing) {
        return (
            <div className="group relative">
                {editable && (
                    <button
                        onClick={startEditing}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-primary/10 text-primary z-10"
                        aria-label="Edit specifications"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                )}
                <div className="grid grid-cols-1 divide-y">
                    {Object.entries(specs).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-3 p-4 gap-4 hover:bg-muted/20">
                            <div className="col-span-1 text-sm font-medium text-muted-foreground">
                                {key}
                            </div>
                            <div className="col-span-2 text-sm font-medium text-foreground">
                                {String(value)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Edit mode
    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                    Editing Specifications
                </span>
                <div className="flex items-center gap-1.5">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={addRow}
                        className="h-7 gap-1 text-xs"
                    >
                        <Plus className="w-3 h-3" /> Add
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-7 gap-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-500/10"
                    >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="h-7 gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                        <X className="w-3 h-3" /> Cancel
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {draft.map((row, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <Input
                            placeholder="Key"
                            value={row.key}
                            onChange={(e) => updateRow(index, "key", e.target.value)}
                            className="flex-1 h-8 text-sm"
                        />
                        <Input
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => updateRow(index, "value", e.target.value)}
                            className="flex-1 h-8 text-sm"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeRow(index)}
                            className="h-7 w-7 text-muted-foreground hover:text-red-500 flex-shrink-0"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                ))}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
