"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"

interface Character {
    char: string
    x: number
    y: number
    speed: number
}

class TextScramble {
    el: HTMLElement
    chars: string
    queue: Array<{
        from: string
        to: string
        start: number
        end: number
        char?: string
    }>
    frame: number
    frameRequest: number
    resolve: (value: void | PromiseLike<void>) => void

    constructor(el: HTMLElement) {
        this.el = el
        this.chars = '!<>-_\\/[]{}—=+*^?#'
        this.queue = []
        this.frame = 0
        this.frameRequest = 0
        this.resolve = () => { }
        this.update = this.update.bind(this)
    }

    setText(newText: string) {
        const oldText = this.el.innerText
        const length = Math.max(oldText.length, newText.length)
        const promise = new Promise<void>((resolve) => this.resolve = resolve)
        this.queue = []

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || ''
            const to = newText[i] || ''
            const start = Math.floor(Math.random() * 40)
            const end = start + Math.floor(Math.random() * 40)
            this.queue.push({ from, to, start, end })
        }

        cancelAnimationFrame(this.frameRequest)
        this.frame = 0
        this.update()
        return promise
    }

    update() {
        let output = ''
        let complete = 0

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i]
            if (this.frame >= end) {
                complete++
                output += to
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.chars[Math.floor(Math.random() * this.chars.length)]
                    this.queue[i].char = char
                }
                output += `<span class="dud">${char}</span>`
            } else {
                output += from
            }
        }

        this.el.innerHTML = output
        if (complete === this.queue.length) {
            this.resolve()
        } else {
            this.frameRequest = requestAnimationFrame(this.update)
            this.frame++
        }
    }

    destroy() {
        cancelAnimationFrame(this.frameRequest)
    }
}

const ScrambledTitle: React.FC = () => {
    const elementRef = useRef<HTMLHeadingElement>(null)
    const scramblerRef = useRef<TextScramble | null>(null)
    const [mounted, setMounted] = useState(false)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    useEffect(() => {
        if (elementRef.current && !scramblerRef.current) {
            scramblerRef.current = new TextScramble(elementRef.current)
            setMounted(true)
        }

        return () => {
            scramblerRef.current?.destroy()
        }
    }, [])

    useEffect(() => {
        if (!mounted || !scramblerRef.current || prefersReducedMotion) return

        const phrases = [
            'Plan. Compare. Build.',
            'RigForgeBD',
            'Your PC, Your Way',
            'Built for Bangladesh',
            'Compare Prices',
            'Build Together'
        ]

        let counter = 0
        let timeoutId: NodeJS.Timeout

        const next = () => {
            if (scramblerRef.current) {
                scramblerRef.current.setText(phrases[counter]).then(() => {
                    timeoutId = setTimeout(next, 2000)
                })
                counter = (counter + 1) % phrases.length
            }
        }

        next()

        return () => clearTimeout(timeoutId)
    }, [mounted, prefersReducedMotion])

    return (
        <h1
            ref={elementRef}
            className="text-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-wider text-center whitespace-nowrap"
            style={{ fontFamily: 'monospace' }}
            aria-label="Plan. Compare. Build. - RigForgeBD"
        >
            Plan. Compare. Build.
        </h1>
    )
}

const RainingLetters: React.FC = () => {
    const [characters, setCharacters] = useState<Character[]>([])
    const [activeIndices, setActiveIndices] = useState<Set<number>>(new Set())
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    // Memoized character generation - reduced count for better performance
    const initialCharacters = useMemo(() => {
        const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        const charCount = 250 // Increased for denser effect
        const newCharacters: Character[] = []

        for (let i = 0; i < charCount; i++) {
            newCharacters.push({
                char: allChars[Math.floor(Math.random() * allChars.length)],
                x: Math.random() * 100,
                y: Math.random() * 100,
                speed: 0.08 + Math.random() * 0.15, // Slower, smoother animation
            })
        }

        return newCharacters
    }, [])

    useEffect(() => {
        setCharacters(initialCharacters)
    }, [initialCharacters])

    // Flicker effect - reduced frequency for better performance
    useEffect(() => {
        if (prefersReducedMotion) return

        const updateActiveIndices = () => {
            const newActiveIndices = new Set<number>()
            const numActive = Math.floor(Math.random() * 2) + 2 // 2-3 active
            for (let i = 0; i < numActive; i++) {
                newActiveIndices.add(Math.floor(Math.random() * characters.length))
            }
            setActiveIndices(newActiveIndices)
        }

        const flickerInterval = setInterval(updateActiveIndices, 100) // Reduced from 50ms
        return () => clearInterval(flickerInterval)
    }, [characters.length, prefersReducedMotion])

    // Animation loop
    useEffect(() => {
        if (prefersReducedMotion) return

        let animationFrameId: number
        const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

        const updatePositions = () => {
            setCharacters(prevChars =>
                prevChars.map(char => ({
                    ...char,
                    y: char.y + char.speed,
                    ...(char.y >= 100 && {
                        y: -5,
                        x: Math.random() * 100,
                        char: allChars[Math.floor(Math.random() * allChars.length)],
                    }),
                }))
            )
            animationFrameId = requestAnimationFrame(updatePositions)
        }

        animationFrameId = requestAnimationFrame(updatePositions)
        return () => cancelAnimationFrame(animationFrameId)
    }, [prefersReducedMotion])

    // Static fallback for reduced motion
    if (prefersReducedMotion) {
        return <div className="relative w-full h-full bg-background" aria-hidden="true" />
    }

    return (
        <div className="relative w-full h-full bg-background overflow-hidden" aria-hidden="true">
            {characters.map((char, index) => (
                <span
                    key={index}
                    className={`absolute transition-colors duration-100 select-none ${activeIndices.has(index)
                        ? "text-primary font-bold"
                        : "text-muted-foreground/30 font-light"
                        }`}
                    style={{
                        left: `${char.x}%`,
                        top: `${char.y}%`,
                        transform: `translate(-50%, -50%) ${activeIndices.has(index) ? 'scale(1.2)' : 'scale(1)'}`,
                        textShadow: activeIndices.has(index)
                            ? '0 0 8px var(--primary)'
                            : 'none',
                        opacity: activeIndices.has(index) ? 0.9 : 0.3,
                        transition: 'color 0.15s, transform 0.15s, text-shadow 0.15s',
                        willChange: 'transform, top',
                        fontSize: '1.5rem'
                    }}
                >
                    {char.char}
                </span>
            ))}

            <style jsx global>{`
                .dud {
                    color: var(--primary);
                    opacity: 0.7;
                }
            `}</style>
        </div>
    )
}

export { RainingLetters, ScrambledTitle }
export default RainingLetters
