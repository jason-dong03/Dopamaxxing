'use client'

import { useState, useEffect } from 'react'

type LineupCard = {
    id: string
    card_level?: number
    cards?: { id: string; name: string; image_url: string; rarity: string }
}
type SavedLineup = { id: string; name: string; slots: string[]; cards?: LineupCard[] }

type Props = {
    acting: boolean
    onStartWithLineup: (cardIds: string[]) => void
    onClose: () => void
}

export function LineupSelectPhase({ acting, onStartWithLineup, onClose }: Props) {
    const [lineups, setLineups] = useState<SavedLineup[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/battle-lineup')
            .then(r => r.json())
            .then(d => { if (Array.isArray(d.lineups)) setLineups(d.lineups) })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#080c10',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                padding: 'clamp(12px,3vw,16px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div>
                    <h2 style={{ fontSize: 'clamp(0.88rem,3vw,1rem)', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                        Choose Your Lineup
                    </h2>
                    <p style={{ fontSize: '0.7rem', color: '#4a5568', margin: '3px 0 0' }}>
                        Select a saved lineup to enter battle
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none', border: 'none', color: '#6b7280',
                        fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1,
                        padding: '4px 8px',
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Lineup list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px,3vw,20px)' }}>
                {loading ? (
                    <p style={{ color: '#4b5563', fontSize: '0.75rem', textAlign: 'center', marginTop: 40 }}>
                        Loading lineups…
                    </p>
                ) : lineups.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: 60 }}>
                        <p style={{ color: '#6b7280', fontSize: '0.78rem', marginBottom: 16 }}>
                            No lineups saved yet.
                        </p>
                        <a
                            href="/dashboard/battles"
                            style={{
                                fontSize: '0.7rem', color: '#a78bfa',
                                textDecoration: 'underline', cursor: 'pointer',
                            }}
                        >
                            Create one in Battles →
                        </a>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, margin: '0 auto' }}>
                        {lineups.map(lu => {
                            const cardIds = (lu.cards ?? []).map(c => c.id).filter(Boolean)
                            const count = cardIds.length
                            const canFight = count === 5
                            return (
                                <button
                                    key={lu.id}
                                    disabled={!canFight || acting}
                                    onClick={() => onStartWithLineup(cardIds)}
                                    style={{
                                        width: '100%',
                                        background: canFight
                                            ? 'rgba(255,255,255,0.03)'
                                            : 'rgba(255,255,255,0.015)',
                                        border: canFight
                                            ? '1px solid rgba(74,222,128,0.2)'
                                            : '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: 12,
                                        padding: '14px 16px',
                                        cursor: canFight && !acting ? 'pointer' : 'not-allowed',
                                        textAlign: 'left',
                                        transition: 'all 150ms ease',
                                        opacity: canFight ? 1 : 0.5,
                                    }}
                                    onMouseEnter={e => {
                                        if (canFight) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,222,128,0.06)'
                                    }}
                                    onMouseLeave={e => {
                                        if (canFight) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
                                            {lu.name}
                                        </span>
                                        <span style={{
                                            fontSize: '0.65rem', fontWeight: 700,
                                            color: canFight ? '#4ade80' : '#ef4444',
                                            background: canFight ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                                            border: `1px solid ${canFight ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                            borderRadius: 20, padding: '2px 9px',
                                        }}>
                                            {count}/5
                                        </span>
                                    </div>
                                    {/* Card images */}
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {(lu.cards ?? []).slice(0, 5).map((c, i) => (
                                            <div key={c.id ?? i} style={{
                                                flex: 1, aspectRatio: '2/3',
                                                borderRadius: 6, overflow: 'hidden',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                            }}>
                                                {c.cards?.image_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={c.cards.image_url}
                                                        alt={c.cards.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)' }} />
                                                )}
                                            </div>
                                        ))}
                                        {/* empty slots */}
                                        {Array.from({ length: Math.max(0, 5 - count) }).map((_, i) => (
                                            <div key={`empty-${i}`} style={{
                                                flex: 1, aspectRatio: '2/3',
                                                borderRadius: 6,
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px dashed rgba(255,255,255,0.08)',
                                            }} />
                                        ))}
                                    </div>
                                    {!canFight && (
                                        <p style={{ fontSize: '0.6rem', color: '#ef4444', margin: '8px 0 0' }}>
                                            Missing {5 - count} card{5 - count !== 1 ? 's' : ''} — edit in Battles
                                        </p>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
