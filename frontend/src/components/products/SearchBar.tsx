"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function SearchBar({
    value,
    onChange,
    placeholder = "Search products...",
    className,
}: SearchBarProps) {
    const [localValue, setLocalValue] = useState(value)
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Sync local value with prop
    useEffect(() => {
        setLocalValue(value)
    }, [value])

    // Debounced onChange
    const handleChange = (newValue: string) => {
        setLocalValue(newValue)

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(() => {
            onChange(newValue)
        }, 300)
    }

    const handleClear = () => {
        setLocalValue("")
        onChange("")
        inputRef.current?.focus()
    }

    return (
        <div
            className={cn(
                "relative flex items-center w-full max-w-md",
                className
            )}
        >
            <div
                className={cn(
                    "relative flex items-center w-full rounded-xl border bg-background transition-all duration-200",
                    isFocused
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border/50 hover:border-border"
                )}
            >
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />

                <input
                    ref={inputRef}
                    type="text"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="w-full h-10 pl-10 pr-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />

                <AnimatePresence>
                    {localValue && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={handleClear}
                            className="absolute right-3 p-1 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="w-3 h-3 text-muted-foreground" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
