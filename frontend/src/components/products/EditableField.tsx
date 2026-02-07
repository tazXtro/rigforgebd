"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pencil, Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface EditableFieldProps {
    /** Current value to display */
    value: string
    /** Called with the new value when the user confirms */
    onSave: (newValue: string) => Promise<{ error?: string }>
    /** Label shown in tooltip / aria */
    label?: string
    /** Render the display value (default: plain text) */
    renderDisplay?: (value: string) => React.ReactNode
    /** Input type */
    inputType?: "text" | "number" | "url"
    /** Extra CSS for the wrapper */
    className?: string
    /** Whether inline editing is enabled */
    editable?: boolean
}

export function EditableField({
    value,
    onSave,
    label,
    renderDisplay,
    inputType = "text",
    className,
    editable = true,
}: EditableFieldProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    // Sync external value changes
    useEffect(() => {
        if (!isEditing) setDraft(value)
    }, [value, isEditing])

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing) inputRef.current?.focus()
    }, [isEditing])

    const handleSave = async () => {
        const trimmed = draft.trim()
        if (trimmed === value) {
            setIsEditing(false)
            return
        }
        setIsSaving(true)
        setError("")
        const result = await onSave(trimmed)
        setIsSaving(false)
        if (result.error) {
            setError(result.error)
        } else {
            setIsEditing(false)
        }
    }

    const handleCancel = () => {
        setDraft(value)
        setIsEditing(false)
        setError("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave()
        if (e.key === "Escape") handleCancel()
    }

    if (!editable) {
        return <>{renderDisplay ? renderDisplay(value) : value}</>
    }

    return (
        <div className={cn("group relative inline-flex items-center gap-1.5", className)}>
            <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.div
                        key="editing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 w-full"
                    >
                        <Input
                            ref={inputRef}
                            type={inputType}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-8 text-sm"
                            aria-label={label}
                            disabled={isSaving}
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-500/10 flex-shrink-0"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex-shrink-0"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="display"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5"
                    >
                        {renderDisplay ? renderDisplay(value) : <span>{value}</span>}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-primary/10 text-primary"
                            aria-label={`Edit ${label || "field"}`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            {error && (
                <span className="absolute -bottom-5 left-0 text-xs text-red-500">{error}</span>
            )}
        </div>
    )
}
