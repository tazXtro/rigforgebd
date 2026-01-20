"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"

interface Character {
    char: string
    x: number
    y: number
    duration: number // CSS animation duration instead of speed
    delay: number    // Animation delay for staggered effect
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
    isDestroyed: boolean

    constructor(el: HTMLElement) {
        this.el = el
        this.chars = '!<>-_\\/[]{}—=+*^?#'
        this.queue = []
        this.frame = 0
        this.frameRequest = 0
        this.resolve = () => { }
        this.isDestroyed = false
        this.update = this.update.bind(this)
    }

    setText(newText: string) {
        if (this.isDestroyed) return Promise.resolve()
        
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
        if (this.isDestroyed) return
        
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
        this.isDestroyed = true
        cancelAnimationFrame(this.frameRequest)
        this.resolve()
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
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    const [characters, setCharacters] = useState<Character[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    // Generate characters only on client to avoid hydration mismatch
    useEffect(() => {
        const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        const charCount = 200
        const newCharacters: Character[] = []

        for (let i = 0; i < charCount; i++) {
            newCharacters.push({
                char: allChars[Math.floor(Math.random() * allChars.length)],
                x: Math.random() * 100,
                y: Math.random() * 100,
                duration: 4 + Math.random() * 6, // 4-10s flicker cycle
                delay: Math.random() * -10, // Staggered start
            })
        }

        setCharacters(newCharacters)
    }, [])

    // Static fallback for reduced motion
    if (prefersReducedMotion) {
        return <div className="relative w-full h-full bg-background" aria-hidden="true" />
    }

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-background overflow-hidden" 
            aria-hidden="true"
        >
            {characters.map((char, index) => (
                <span
                    key={index}
                    className="flicker-letter absolute select-none text-muted-foreground/30 font-light"
                    style={{
                        left: `${char.x}%`,
                        top: `${char.y}%`,
                        fontSize: '1.5rem',
                        transform: 'translate(-50%, -50%)',
                        animationDuration: `${char.duration}s`,
                        animationDelay: `${char.delay}s`,
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
                
                @keyframes flicker {
                    0%, 100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(1);
                        text-shadow: none;
                    }
                    44% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(1);
                        text-shadow: none;
                    }
                    48% {
                        color: var(--primary);
                        opacity: 0.7;
                        transform: translate(-50%, -50%) scale(1.15);
                        text-shadow: 0 0 10px var(--primary);
                    }
                    52% {
                        color: var(--primary);
                        opacity: 0.7;
                        transform: translate(-50%, -50%) scale(1.15);
                        text-shadow: 0 0 10px var(--primary);
                    }
                    56% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(1);
                        text-shadow: none;
                    }
                }
                
                .flicker-letter {
                    animation: flicker ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}

export { RainingLetters, ScrambledTitle }
export default RainingLetters
