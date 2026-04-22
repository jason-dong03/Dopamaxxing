'use client'
import { useEffect, useState } from 'react'

const STEPS: { ms: number; pct: number; label: string }[] = [
    { ms: 0,    pct: 5,  label: 'Connecting…' },
    { ms: 300,  pct: 18, label: 'Authenticating session…' },
    { ms: 650,  pct: 34, label: 'Fetching user data…' },
    { ms: 1000, pct: 50, label: 'Loading card collection…' },
    { ms: 1350, pct: 64, label: 'Fetching assets…' },
    { ms: 1650, pct: 76, label: 'Syncing quests & achievements…' },
    { ms: 1950, pct: 88, label: 'Preparing the shop…' },
    { ms: 2300, pct: 96, label: 'Almost there…' },
]

const S = {
    bg:     'rgba(255,255,255,0.07)',
    bgFaint:'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
}

export default function DashboardLoading() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        const timers = STEPS.slice(1).map(({ ms }, i) =>
            setTimeout(() => setStep(i + 1), ms)
        )
        return () => timers.forEach(clearTimeout)
    }, [])

    const { pct, label } = STEPS[step]

    return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}>

            {/* ── header skeleton ── */}
            <div
                className="animate-pulse"
                style={{
                    width: '100%',
                    background: '#000',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                    zIndex: 40,
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
                    {/* left */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <div className="hidden sm:flex" style={{ flexDirection: 'column', gap: 3, flexShrink: 0, marginRight: 4 }}>
                            <div style={{ height: 11, width: 88, borderRadius: 3, background: S.bg }} />
                        </div>
                        <div className="hidden sm:block" style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                            <div style={{ height: 11, width: 80, borderRadius: 4, background: S.bg }} />
                            <div className="hidden sm:block" style={{ height: 8, width: 56, borderRadius: 4, background: S.bgFaint }} />
                        </div>
                    </div>
                    {/* right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ height: 26, width: 72, borderRadius: 999, background: S.bg }} />
                        <div className="hidden sm:block" style={{ height: 26, width: 44, borderRadius: 999, background: S.bg }} />
                        <div style={{ height: 26, width: 84, borderRadius: 999, background: S.bg }} />
                        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 26, width: 46, borderRadius: 999, background: S.bg }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                <div style={{ width: 100, height: 5, borderRadius: 3, background: S.bgFaint }} />
                                <div style={{ width: 60, height: 7, borderRadius: 3, background: S.bgFaint }} />
                            </div>
                        </div>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />
                    </div>
                </div>
            </div>

            {/* ── pack area skeleton ── */}
            <div
                className="animate-pulse"
                style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 0' }}
            >
                {/* tab row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {['Classic', 'Special', 'Crates', 'Test'].map((tab, i) => (
                        <div
                            key={tab}
                            style={{
                                height: 28,
                                width: 58,
                                borderRadius: 8,
                                background: i === 0 ? S.bg : S.bgFaint,
                            }}
                        />
                    ))}
                </div>
                {/* card grid */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                style={{ aspectRatio: '3/4', borderRadius: 12, background: S.bgFaint, border: S.border }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── progress — fixed bottom ── */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '20px 24px 28px',
                background: 'linear-gradient(0deg, rgba(0,0,0,0.99) 0%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                pointerEvents: 'none',
            }}>
                <span
                    key={label}
                    style={{
                        fontSize: '0.68rem',
                        color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.07em',
                        fontFamily: 'monospace',
                        animation: 'fadeInLabel 0.25s ease',
                    }}
                >
                    {label}
                </span>
                <div style={{
                    width: '100%',
                    maxWidth: 280,
                    height: 3,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 3,
                        background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                        transition: 'width 350ms ease-out',
                        boxShadow: '0 0 10px rgba(74,222,128,0.5)',
                    }} />
                </div>
                <span style={{
                    fontSize: '0.55rem',
                    color: 'rgba(255,255,255,0.12)',
                    letterSpacing: '0.05em',
                    fontFamily: 'monospace',
                }}>
                    {pct}%
                </span>
            </div>

            <style>{`
                @keyframes fadeInLabel {
                    from { opacity: 0; transform: translateY(4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
