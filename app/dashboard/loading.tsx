'use client'
import { useEffect, useState } from 'react'

const STEPS: { ms: number; pct: number; label: string }[] = [
    { ms: 0,    pct: 8,  label: 'Initializing session…' },
    { ms: 320,  pct: 24, label: 'Fetching your profile…' },
    { ms: 680,  pct: 42, label: 'Loading your card collection…' },
    { ms: 1050, pct: 58, label: 'Syncing quest progress…' },
    { ms: 1380, pct: 72, label: 'Checking bag & stash…' },
    { ms: 1700, pct: 84, label: 'Preparing the shop…' },
    { ms: 2050, pct: 94, label: 'Almost ready…' },
]

const S = {
    bg: 'rgba(255,255,255,0.06)',
    bgFaint: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadiusPill: 999,
}

export default function DashboardLoading() {
    const [pct, setPct] = useState(STEPS[0].pct)
    const [label, setLabel] = useState(STEPS[0].label)

    useEffect(() => {
        const timers = STEPS.slice(1).map(({ ms, pct: p, label: l }) =>
            setTimeout(() => { setPct(p); setLabel(l) }, ms)
        )
        return () => timers.forEach(clearTimeout)
    }, [])

    return (
        <div className="min-h-screen" style={{ background: '#08080d' }}>
            {/* sticky header bar */}
            <div
                className="animate-pulse sticky top-0 z-40"
                style={{
                    width: '100%',
                    background: '#08080d',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        padding: '0 16px',
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <div style={{ height: 11, width: 80, borderRadius: 4, background: S.bg }} />
                        <div className="hidden sm:block" style={{ height: 8, width: 60, borderRadius: 4, background: S.bgFaint }} />
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ height: 26, width: 84, borderRadius: S.borderRadiusPill, background: S.bg, flexShrink: 0 }} />
                    <div style={{ height: 26, width: 54, borderRadius: S.borderRadiusPill, background: S.bg, flexShrink: 0 }} />
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />
                </div>
            </div>

            {/* pack cards skeleton */}
            <div
                className="animate-pulse"
                style={{ maxWidth: 700, margin: '0 auto', padding: '28px 16px' }}
            >
                <div style={{ height: 14, width: 100, borderRadius: 4, background: S.bg, marginBottom: 20 }} />
                <div style={{ display: 'flex', gap: 12, overflowX: 'hidden' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                flexShrink: 0,
                                width: 'clamp(100px, 20vw, 140px)',
                                aspectRatio: '3/4',
                                borderRadius: 12,
                                background: S.bgFaint,
                                border: S.border,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* progress bar — fixed bottom */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 24px 20px',
                background: 'linear-gradient(0deg, rgba(8,8,13,0.98) 0%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                pointerEvents: 'none',
            }}>
                <span style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.28)',
                    letterSpacing: '0.06em',
                    fontFamily: 'monospace',
                    transition: 'opacity 300ms',
                }}>
                    {label}
                </span>
                <div style={{
                    width: '100%',
                    maxWidth: 260,
                    height: 2,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                        transition: 'width 300ms ease-out',
                        boxShadow: '0 0 8px rgba(139,92,246,0.6)',
                    }} />
                </div>
            </div>
        </div>
    )
}
