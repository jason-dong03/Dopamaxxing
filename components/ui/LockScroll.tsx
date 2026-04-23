'use client'
import { useEffect } from 'react'

export default function LockScroll() {
    useEffect(() => {
        // Reset any scroll position carried over from other pages (bag, profile, etc.)
        // On mobile, a non-zero window.scrollY offsets the 100dvh flex layout.
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0

        const prevHtml = document.documentElement.style.overflow
        const prevBody = document.body.style.overflow
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
        return () => {
            document.documentElement.style.overflow = prevHtml
            document.body.style.overflow = prevBody
        }
    }, [])
    return null
}
