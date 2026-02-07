"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { checkAdminStatus } from "@/lib/adminApi"

/**
 * Lightweight hook to check if the current user is an admin.
 *
 * Unlike `useAdminAuth()` (which requires AdminAuthProvider), this hook
 * can be used anywhere in the app. It caches the result per session
 * so re-renders don't re-fetch.
 */
export function useIsAdmin() {
    const { user, isLoaded, isSignedIn } = useUser()
    const [isAdmin, setIsAdmin] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        if (!isLoaded) return

        if (!isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
            setIsAdmin(false)
            setIsChecking(false)
            return
        }

        const email = user.primaryEmailAddress.emailAddress

        // Check sessionStorage cache first
        const cacheKey = `rigforge_admin_${email}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached !== null) {
            setIsAdmin(cached === "true")
            setIsChecking(false)
            return
        }

        // Fetch from API
        setIsChecking(true)
        checkAdminStatus(email)
            .then((result) => {
                setIsAdmin(result)
                sessionStorage.setItem(cacheKey, String(result))
            })
            .catch(() => setIsAdmin(false))
            .finally(() => setIsChecking(false))
    }, [isLoaded, isSignedIn, user])

    return {
        isAdmin,
        isChecking,
        adminEmail: isAdmin ? user?.primaryEmailAddress?.emailAddress || "" : "",
    }
}
