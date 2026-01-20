"use client"

import { useEffect, useRef, useState, useCallback } from "react"

declare global {
    interface Window {
        THREE: any
    }
}

export function ShaderAnimation() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    const [isDark, setIsDark] = useState(true)
    const [isVisible, setIsVisible] = useState(true)
    const isVisibleRef = useRef(true) // Ref for animation loop access
    const sceneRef = useRef<{
        camera: any
        scene: any
        renderer: any
        uniforms: any
        animationId: number | null
        resizeHandler: (() => void) | null
        isDestroyed: boolean
    }>({
        camera: null,
        scene: null,
        renderer: null,
        uniforms: null,
        animationId: null,
        resizeHandler: null,
        isDestroyed: false,
    })

    // Keep ref in sync with state
    useEffect(() => {
        isVisibleRef.current = isVisible
    }, [isVisible])

    // Use Intersection Observer to pause animations when not visible
    useEffect(() => {
        if (!containerRef.current) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    setIsVisible(entry.isIntersecting)
                })
            },
            { threshold: 0 }
        )

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // Detect theme changes
    useEffect(() => {
        const checkTheme = () => {
            const dark = document.documentElement.classList.contains('dark')
            setIsDark(dark)
            // Update shader uniform if exists
            if (sceneRef.current.uniforms) {
                sceneRef.current.uniforms.isDarkMode.value = dark ? 1.0 : 0.0
            }
        }

        checkTheme()

        const observer = new MutationObserver(checkTheme)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        return () => observer.disconnect()
    }, [])

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    const initThreeJS = useCallback(() => {
        if (!containerRef.current || !window.THREE) return

        const THREE = window.THREE
        const container = containerRef.current

        // Clear any existing content
        container.innerHTML = ""

        // Initialize camera
        const camera = new THREE.Camera()
        camera.position.z = 1

        // Initialize scene
        const scene = new THREE.Scene()

        // Create geometry
        const geometry = new THREE.PlaneBufferGeometry(2, 2)

        // Define uniforms
        const isDarkMode = document.documentElement.classList.contains('dark')
        const uniforms = {
            time: { type: "f", value: 1.0 },
            resolution: { type: "v2", value: new THREE.Vector2() },
            isDarkMode: { type: "f", value: isDarkMode ? 1.0 : 0.0 },
        }

        // Vertex shader
        const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `

        // Fragment shader - adjusted colors to match theme (warm orange/amber tones)
        // Includes isDarkMode uniform for theme-aware intensity
        const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float isDarkMode;
        
      float random (in float x) {
          return fract(sin(x)*1e4);
      }
      float random (vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))*
              43758.5453123);
      }
      
      varying vec2 vUv;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        
        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256,256);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
          
        float t = time*0.06+random(uv.x)*0.4;
        
        // Light mode: boost line width for more visibility
        float lineWidth = isDarkMode > 0.5 ? 0.0008 : 0.0014;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i=0; i < 5; i++){
            color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
          }
        }

        // Theme-aware color output: boost intensity for light mode
        float intensity = isDarkMode > 0.5 ? 1.0 : 1.8;
        float r = color[0] * 1.2 * intensity;
        float g = color[1] * 0.65 * intensity;
        float b = color[2] * 0.35 * intensity;

        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `

        // Create material
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        })

        // Create mesh and add to scene
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        // Initialize renderer
        const renderer = new THREE.WebGLRenderer()
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Limit for performance
        container.appendChild(renderer.domElement)

        // Handle resize
        const onWindowResize = () => {
            if (sceneRef.current.isDestroyed) return
            const rect = container.getBoundingClientRect()
            renderer.setSize(rect.width, rect.height)
            uniforms.resolution.value.x = renderer.domElement.width
            uniforms.resolution.value.y = renderer.domElement.height
        }

        // Store references
        sceneRef.current = {
            camera,
            scene,
            renderer,
            uniforms,
            animationId: null,
            resizeHandler: onWindowResize,
            isDestroyed: false,
        }

        onWindowResize()
        window.addEventListener("resize", onWindowResize, false)

        // Animation loop with visibility check
        const animate = () => {
            if (sceneRef.current.isDestroyed) return
            
            sceneRef.current.animationId = requestAnimationFrame(animate)
            
            // Only render when visible to free up the main thread during navigation
            if (isVisibleRef.current) {
                uniforms.time.value += 0.05
                renderer.render(scene, camera)
            }
        }

        animate()
    }, [])

    useEffect(() => {
        if (prefersReducedMotion) return

        // Load Three.js dynamically
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js"
        script.onload = () => {
            if (containerRef.current && window.THREE) {
                initThreeJS()
            }
        }
        document.head.appendChild(script)

        return () => {
            // Mark as destroyed first to stop animation loop
            sceneRef.current.isDestroyed = true
            
            // Cleanup
            if (sceneRef.current.animationId) {
                cancelAnimationFrame(sceneRef.current.animationId)
                sceneRef.current.animationId = null
            }
            if (sceneRef.current.resizeHandler) {
                window.removeEventListener('resize', sceneRef.current.resizeHandler)
            }
            if (sceneRef.current.renderer) {
                sceneRef.current.renderer.dispose()
            }
            if (script.parentNode) {
                document.head.removeChild(script)
            }
        }
    }, [prefersReducedMotion, initThreeJS])

    // Static fallback for reduced motion
    if (prefersReducedMotion) {
        return (
            <div
                className="w-full h-full absolute bg-gradient-to-br from-primary/5 to-primary/10"
                aria-hidden="true"
            />
        )
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full absolute"
            aria-hidden="true"
        />
    )
}
