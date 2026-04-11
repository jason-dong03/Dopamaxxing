'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { formatBR } from '@/lib/battlePower'

type Metric = 'packs' | 'br' | 'level' | 'coins'
type Row = { rank: number; id: string; username: string; profile_url: string | null; value: number }

const TABS: { key: Metric; label: string }[] = [
    { key: 'packs',  label: 'Packs' },
    { key: 'br',     label: 'BR' },
    { key: 'level',  label: 'Level' },
    { key: 'coins',  label: 'Coins' },
]

function formatValue(metric: Metric, value: number): string {
    if (metric === 'br')    return formatBR(value)
    if (metric === 'coins') return `$${value.toLocaleString()}`
    return value.toLocaleString()
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function LeaderboardSidebar() {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Metric>('br')
    const [rows, setRows] = useState<Row[]>([])
    const [loading, setLoading] = useState(false)
    const cache = useRef<Partial<Record<Metric, Row[]>>>({})

    async function load(metric: Metric) {
        if (cache.current[metric]) {
            setRows(cache.current[metric]!)
            return
        }
        setLoading(true)
        setRows([])
        try {
            const res = await fetch(`/api/leaderboard?metric=${metric}`)
            const json = await res.json()
            cache.current[metric] = json.rows ?? []
            setRows(cache.current[metric]!)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) load(activeTab)
    }, [open, activeTab])

    return (
        <>
            {/* Toggle button — fixed right edge, vertically centered */}
            <button
                onClick={() => setOpen((v) => !v)}
                title="Leaderboard"
                style={{
                    position: 'fixed',
                    right: open ? 304 : 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 9000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 64,
                    borderRadius: '8px 0 0 8px',
                    background: open ? 'rgba(30,30,48,0.98)' : 'rgba(20,20,32,0.92)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRight: 'none',
                    cursor: 'pointer',
                    color: open ? '#e2e8f0' : '#64748b',
                    backdropFilter: 'blur(8px)',
                    transition: 'right 0.28s cubic-bezier(0.4,0,0.2,1), color 0.15s, background 0.15s',
                    boxShadow: '-4px 0 16px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={e => {
                    if (!open) (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0'
                }}
                onMouseLeave={e => {
                    if (!open) (e.currentTarget as HTMLButtonElement).style.color = '#64748b'
                }}
            >
                {/* Trophy / leaderboard SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4" />
                    <path d="M18 9h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
                    <path d="M12 17v4" />
                    <path d="M8 21h8" />
                    <path d="M6 3h12v9a6 6 0 0 1-12 0V3z" />
                </svg>
            </button>

            {/* Sidebar panel */}
            <div
                style={{
                    position: 'fixed',
                    right: open ? 0 : -304,
                    top: 0,
                    bottom: 0,
                    width: 304,
                    zIndex: 8999,
                    background: 'rgba(12,12,20,0.98)',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'right 0.28s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.5)' : 'none',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 16px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    paddingBottom: 12,
                    flexShrink: 0,
                }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                        Leaderboard
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    flexShrink: 0,
                }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                flex: 1,
                                padding: '9px 0',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab.key ? '2px solid #60a5fa' : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                color: activeTab === tab.key ? '#e2e8f0' : '#475569',
                                transition: 'color 0.15s',
                                marginBottom: -1,
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Rows */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                    {loading && (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: '#475569', fontSize: '0.72rem' }}>
                            loading…
                        </div>
                    )}
                    {!loading && rows.length === 0 && (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: '#475569', fontSize: '0.72rem' }}>
                            no data
                        </div>
                    )}
                    {!loading && rows.map(row => (
                        <div
                            key={row.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '7px 16px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}
                        >
                            {/* Rank */}
                            <span style={{
                                width: 22,
                                textAlign: 'center',
                                fontSize: MEDAL[row.rank] ? '1rem' : '0.65rem',
                                fontWeight: 700,
                                color: '#475569',
                                flexShrink: 0,
                                lineHeight: 1,
                            }}>
                                {MEDAL[row.rank] ?? `#${row.rank}`}
                            </span>

                            {/* Avatar */}
                            {row.profile_url ? (
                                <Image
                                    src={row.profile_url}
                                    alt={row.username}
                                    width={24}
                                    height={24}
                                    style={{ borderRadius: '50%', flexShrink: 0, opacity: 0.9 }}
                                />
                            ) : (
                                <div style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
                                    flexShrink: 0,
                                }} />
                            )}

                            {/* Username */}
                            <span style={{
                                flex: 1,
                                fontSize: '0.72rem',
                                fontWeight: 500,
                                color: '#cbd5e1',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {row.username}
                            </span>

                            {/* Value */}
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#94a3b8',
                                flexShrink: 0,
                            }}>
                                {formatValue(activeTab, row.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Backdrop on mobile */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 8998,
                        background: 'rgba(0,0,0,0.4)',
                    }}
                    className="sm:hidden"
                />
            )}
        </>
    )
}
