'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'

function useNarrow(breakpoint = 480) {
    const w = useSyncExternalStore(
        (cb) => {
            window.addEventListener('resize', cb)
            return () => window.removeEventListener('resize', cb)
        },
        () => window.innerWidth,
        () => 999,
    )
    return w < breakpoint
}
import { RARITY_COLOR } from '@/lib/rarityConfig'
import { NATURE_BY_NAME } from '@/lib/pokemon-stats'
export type { CardForBattle } from '@/lib/types'
import type { CardForBattle } from '@/lib/types'

type SortBy = 'hp-desc' | 'atk-desc' | 'spd-desc' | 'level-desc' | 'name-asc'

type Props = {
    cards: CardForBattle[]
    selected: string[]
    loadingCards: boolean
    acting: boolean
    sortBy: SortBy
    setSortBy: (s: SortBy) => void
    onToggleCard: (id: string) => void
    onStartBattle: () => void
    onClose: () => void
    startError?: string | null
}

export function CardSelectPhase({
    cards,
    selected,
    loadingCards,
    acting,
    sortBy,
    setSortBy,
    onToggleCard,
    onStartBattle,
    onClose,
}: Props) {
    const narrow = useNarrow(480)
    const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set())
    type SavedLineup = { id: string; name: string; slots: string[]; cards?: { id: string }[] }
    const [savedLineups, setSavedLineups] = useState<SavedLineup[]>([])
    const [lineupMenuOpen, setLineupMenuOpen] = useState(false)

    // Load saved lineups on mount
    useEffect(() => {
        fetch('/api/battle-lineup')
            .then((r) => r.json())
            .then((d) => {
                if (Array.isArray(d.lineups)) setSavedLineups(d.lineups)
            })
            .catch(() => {})
    }, [])

    function applyLineup(slots: string[]) {
        const valid = slots.filter((id) => cards.some((c) => c.userCardId === id))
        // Deselect current, select new
        selected.filter((id) => !valid.includes(id)).forEach((id) => onToggleCard(id))
        valid.forEach((id) => { if (!selected.includes(id)) onToggleCard(id) })
        setLineupMenuOpen(false)
    }

    const filtered = [...cards].sort((a, b) => {
        if (sortBy === 'hp-desc') return b.hp - a.hp
        if (sortBy === 'atk-desc') return (b.atk ?? 0) - (a.atk ?? 0)
        if (sortBy === 'spd-desc') return (b.spd ?? 0) - (a.spd ?? 0)
        if (sortBy === 'level-desc') return b.level - a.level
        return a.name.localeCompare(b.name)
    })

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#080c10',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: 'clamp(12px,3vw,16px) clamp(12px,3vw,16px) 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                    }}
                >
                    <div>
                        <h2
                            style={{
                                fontSize: 'clamp(0.88rem,3vw,1rem)',
                                fontWeight: 700,
                                color: '#e2e8f0',
                                margin: 0,
                            }}
                        >
                            Choose Your Team
                        </h2>
                        <p
                            style={{
                                fontSize: '0.7rem',
                                color: '#4a5568',
                                margin: '3px 0 0',
                            }}
                        >
                            Pick 5 cards — higher HP survives longer
                        </p>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setLineupMenuOpen(o => !o)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 8,
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    background: 'rgba(168,139,250,0.1)',
                                    border: '1px solid rgba(168,139,250,0.35)',
                                    color: '#a78bfa',
                                    cursor: 'pointer',
                                }}
                            >
                                {savedLineups.length > 0 ? 'Lineups ▾' : 'No Lineups'}
                            </button>
                            {lineupMenuOpen && savedLineups.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '110%',
                                    right: 0,
                                    zIndex: 10,
                                    background: '#0f172a',
                                    border: '1px solid rgba(168,139,250,0.3)',
                                    borderRadius: 8,
                                    minWidth: 160,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                                    overflow: 'hidden',
                                }}>
                                    {savedLineups.map((lu) => (
                                        <button
                                            key={lu.id}
                                            onClick={() => applyLineup(lu.slots)}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '8px 12px',
                                                background: 'none',
                                                border: 'none',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                color: '#e2e8f0',
                                                fontSize: '0.68rem',
                                                fontWeight: 600,
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {lu.name}
                                            <span style={{ color: '#4b5563', fontSize: '0.58rem', marginLeft: 6 }}>
                                                {(lu.cards ?? lu.slots).length} cards
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background:
                                    selected.length === 5
                                        ? 'rgba(248,113,113,0.1)'
                                        : 'rgba(255,255,255,0.04)',
                                border:
                                    selected.length === 5
                                        ? '1px solid rgba(248,113,113,0.4)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 20,
                                padding: '5px 12px',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color:
                                        selected.length === 5
                                            ? '#f87171'
                                            : '#6b7280',
                                }}
                            >
                                {selected.length} / 5
                            </span>
                        </div>
                    </div>
                </div>

                {/* Selected strip */}
                {selected.length > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                            marginBottom: 10,
                        }}
                    >
                        {selected.map((id, pos) => {
                            const card = cards.find((c) => c.userCardId === id)
                            if (!card) return null
                            return (
                                <div
                                    key={id}
                                    onClick={() => onToggleCard(id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: 'rgba(74,222,128,0.08)',
                                        border: '1px solid rgba(74,222,128,0.3)',
                                        borderRadius: 20,
                                        padding: '3px 10px 3px 6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.58rem',
                                            color: '#4ade80',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {pos + 1}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '0.68rem',
                                            color: '#e2e8f0',
                                            maxWidth: 80,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {card.name}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '0.6rem',
                                            color:
                                                RARITY_COLOR[
                                                    card.rarity as keyof typeof RARITY_COLOR
                                                ] ?? '#94a3b8',
                                        }}
                                    >
                                        {card.hp}HP
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '0.6rem',
                                            color: '#4a5568',
                                        }}
                                    >
                                        ✕
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Sort filters */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                        ['hp-desc',    'HP ↓'],
                        ['atk-desc',   'ATK ↓'],
                        ['spd-desc',   'SPD ↓'],
                        ['level-desc', 'Level ↓'],
                        ['name-asc',   'Name'],
                    ] as [SortBy, string][]).map(([s, label]) => (
                        <button
                            key={s}
                            onClick={() => setSortBy(s)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: sortBy === s ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                                border: sortBy === s ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                color: sortBy === s ? '#4ade80' : '#6b7280',
                                transition: 'all 150ms',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Card grid */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 16px 110px',
                    WebkitOverflowScrolling: 'touch' as any,
                }}
            >
                {loadingCards ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: 48,
                            color: '#4a5568',
                            fontSize: '0.82rem',
                        }}
                    >
                        Loading your cards...
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: 48,
                            color: '#374151',
                            fontSize: '0.78rem',
                        }}
                    >
                        No cards match this filter.
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                            gap: 10,
                            margin: '0 auto',
                            width: '100%',
                        }}
                    >
                        {filtered.map((card) => {
                            const isSel = selected.includes(card.userCardId)
                            const disabled = !isSel && selected.length >= 5
                            const selPos = selected.indexOf(card.userCardId) + 1
                            const rarityCol =
                                RARITY_COLOR[
                                    card.rarity as keyof typeof RARITY_COLOR
                                ] ?? '#94a3b8'
                            const activeTab = expandedStats.has(card.userCardId)
                                ? 'moves'
                                : 'stats'

                            const STAT_AVG: Record<string, number> = {
                                hp: 200,
                                def: 130,
                                atk: 130,
                                spd: 90,
                                spatk: 130,
                                spdef: 130,
                                accuracy: 130,
                                evasion: 30,
                            }
                            // display key → CardStats key for nature lookup
                            const STAT_KEY: Record<string, string> = {
                                atk: 'stat_atk',
                                def: 'stat_def',
                                spatk: 'stat_spatk',
                                spdef: 'stat_spdef',
                                spd: 'stat_spd',
                                accuracy: 'stat_accuracy',
                                evasion: 'stat_evasion',
                            }
                            const natureModifiers = card.nature
                                ? (NATURE_BY_NAME[card.nature]?.modifiers ?? {})
                                : {}
                            const natureSuffix = (key: string) => {
                                const cardKey = STAT_KEY[key]
                                if (!cardKey) return null
                                const mult = (
                                    natureModifiers as Record<string, number>
                                )[cardKey]
                                if (!mult || mult === 1) return null
                                const pct = Math.round((mult - 1) * 100)
                                return {
                                    label: `(${pct > 0 ? '+' : ''}${pct}%)`,
                                    color: pct > 0 ? '#4ade80' : '#f87171',
                                }
                            }
                            const sc = (key: string, val: number | null) =>
                                val == null
                                    ? '#2d3748'
                                    : val >= (STAT_AVG[key] ?? 100)
                                      ? '#4ade80'
                                      : '#f87171'

                            const statPair = (
                                l1: string,
                                k1: string,
                                v1: number | null,
                                l2: string,
                                k2: string,
                                v2: number | null,
                                extra1?: {
                                    label: string
                                    color: string
                                } | null,
                            ) => {
                                const s1 = natureSuffix(k1),
                                    s2 = natureSuffix(k2)
                                return (
                                    <div style={{ display: 'flex', gap: 9 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                minWidth: 66,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.66rem',
                                                    color: '#4b5563',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {l1}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: sc(k1, v1),
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {v1 ?? '—'}
                                            </span>
                                            {s1 && !narrow && (
                                                <span
                                                    style={{
                                                        fontSize: '0.5rem',
                                                        color: s1.color,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {s1.label}
                                                </span>
                                            )}
                                            {extra1 && !narrow && (
                                                <span
                                                    style={{
                                                        fontSize: '0.5rem',
                                                        color: extra1.color,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {extra1.label}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 3,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.66rem',
                                                    color: '#4b5563',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {l2}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: sc(k2, v2),
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {v2 ?? '—'}
                                            </span>
                                            {s2 && !narrow && (
                                                <span
                                                    style={{
                                                        fontSize: '0.5rem',
                                                        color: s2.color,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {s2.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={card.userCardId}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        position: 'relative',
                                        background: isSel
                                            ? 'rgba(74,222,128,0.07)'
                                            : 'rgba(255,255,255,0.025)',
                                        border: isSel
                                            ? '1px solid rgba(74,222,128,0.35)'
                                            : `1px solid ${rarityCol}22`,
                                        borderRadius: 10,
                                        opacity: disabled ? 0.3 : 1,
                                        transition: 'all 120ms ease',
                                    }}
                                >
                                    {/* LEFT: full card image */}
                                    <div
                                        onClick={() =>
                                            !disabled &&
                                            onToggleCard(card.userCardId)
                                        }
                                        style={{
                                            position: 'relative',
                                            flexShrink: 0,
                                            cursor: disabled
                                                ? 'not-allowed'
                                                : 'pointer',
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={card.imageUrl}
                                            alt={card.name}
                                            style={{
                                                width: 'clamp(100px, 35vw, 165px)',
                                                display: 'block',
                                                borderRadius: '9px 0 0 9px',
                                            }}
                                            onError={(e) => {
                                                ;(
                                                    e.target as HTMLImageElement
                                                ).style.display = 'none'
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                right: 0,
                                                bottom: 0,
                                                width: 2,
                                                background: rarityCol,
                                                opacity: 0.4,
                                            }}
                                        />
                                        {isSel && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 6,
                                                    left: 6,
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: '50%',
                                                    background: '#4ade80',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.66rem',
                                                    fontWeight: 800,
                                                    color: '#000',
                                                }}
                                            >
                                                {selPos}
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT: info + tabs */}
                                    <div
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            padding: '8px 8px 6px 8px',
                                        }}
                                    >
                                        {/* Name + level */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                gap: 5,
                                                marginBottom: 2,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700,
                                                    color: '#e2e8f0',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    minWidth: 0,
                                                }}
                                            >
                                                {card.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.62rem',
                                                    color: '#4b5563',
                                                    fontWeight: 600,
                                                    flexShrink: 0,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Lv {card.level}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                marginBottom: 6,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.66rem',
                                                    color: rarityCol,
                                                    fontWeight: 600,
                                                    opacity: 0.85,
                                                }}
                                            >
                                                {card.rarity}
                                            </span>
                                            {card.nature && (
                                                <span
                                                    style={{
                                                        fontSize: '0.62rem',
                                                        color: '#a78bfa',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {card.nature}
                                                </span>
                                            )}
                                        </div>

                                        {/* Tab bar */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 4,
                                                marginBottom: 6,
                                            }}
                                        >
                                            {(['stats', 'moves'] as const).map(
                                                (tab) => (
                                                    <button
                                                        key={tab}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setExpandedStats(
                                                                (prev) => {
                                                                    const next =
                                                                        new Set(
                                                                            prev,
                                                                        )
                                                                    if (
                                                                        tab ===
                                                                        'moves'
                                                                    )
                                                                        next.add(
                                                                            card.userCardId,
                                                                        )
                                                                    else
                                                                        next.delete(
                                                                            card.userCardId,
                                                                        )
                                                                    return next
                                                                },
                                                            )
                                                        }}
                                                        style={{
                                                            background:
                                                                activeTab ===
                                                                tab
                                                                    ? 'rgba(255,255,255,0.08)'
                                                                    : 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '2px 8px',
                                                            borderRadius: 4,
                                                            fontSize: '0.66rem',
                                                            fontWeight: 700,
                                                            color:
                                                                activeTab ===
                                                                tab
                                                                    ? '#e2e8f0'
                                                                    : '#4b5563',
                                                            transition:
                                                                'all 100ms',
                                                        }}
                                                    >
                                                        {tab}
                                                    </button>
                                                ),
                                            )}
                                        </div>

                                        {/* Stats tab */}
                                        {activeTab === 'stats' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 2,
                                                }}
                                            >
                                                {statPair(
                                                    'HP',
                                                    'hp',
                                                    card.hp,
                                                    'DEF',
                                                    'def',
                                                    card.def,
                                                    {
                                                        label: `(+${card.level * 22})`,
                                                        color: '#60a5fa',
                                                    },
                                                )}
                                                {statPair(
                                                    'ATK',
                                                    'atk',
                                                    card.atk,
                                                    'SPD',
                                                    'spd',
                                                    card.spd,
                                                )}
                                                {statPair(
                                                    'SPA',
                                                    'spatk',
                                                    card.spatk,
                                                    'SPE',
                                                    'spdef',
                                                    card.spdef,
                                                )}
                                                {statPair(
                                                    'ACC',
                                                    'accuracy',
                                                    card.accuracy,
                                                    'EVA',
                                                    'evasion',
                                                    card.evasion,
                                                )}
                                            </div>
                                        )}

                                        {/* Moves tab */}
                                        {activeTab === 'moves' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 5,
                                                }}
                                            >
                                                {card.moves &&
                                                card.moves.length > 0 ? (
                                                    card.moves.map(
                                                        (move, i) => (
                                                            <div
                                                                key={i}
                                                                style={{
                                                                    display:
                                                                        'grid',
                                                                    gridTemplateColumns:
                                                                        '1fr 24px 48px',
                                                                    alignItems:
                                                                        'center',
                                                                    gap: 3,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            '0.58rem',
                                                                        fontWeight: 700,
                                                                        color: '#e2e8f0',
                                                                        overflow:
                                                                            'hidden',
                                                                        textOverflow:
                                                                            'ellipsis',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                    }}
                                                                >
                                                                    {
                                                                        move.displayName
                                                                    }
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            '0.5rem',
                                                                        color: '#f87171',
                                                                        fontWeight: 600,
                                                                        textAlign:
                                                                            'right',
                                                                    }}
                                                                >
                                                                    {move.power ??
                                                                        ''}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            '0.44rem',
                                                                        fontWeight: 600,
                                                                        textAlign:
                                                                            'center',
                                                                        padding:
                                                                            '1px 3px',
                                                                        borderRadius: 3,
                                                                        background:
                                                                            'rgba(255,255,255,0.06)',
                                                                        color: '#6b7280',
                                                                    }}
                                                                >
                                                                    {move.type}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontSize: '0.66rem',
                                                            color: '#374151',
                                                        }}
                                                    >
                                                        No moves
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Loading overlay while fetching move data */}
            {acting && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100000,
                        background: 'rgba(0,0,0,0.92)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 18,
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/trainers/N.gif"
                        alt="N"
                        style={{
                            height: 88,
                            imageRendering: 'pixelated',
                            filter: 'drop-shadow(0 0 20px rgba(74,222,128,0.5))',
                        }}
                        onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                                'none'
                        }}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <p
                            style={{
                                color: '#4ade80',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                margin: '0 0 6px',
                            }}
                        >
                            Preparing the battle...
                        </p>
                        <p
                            style={{
                                color: '#4b5563',
                                fontSize: '0.72rem',
                                margin: 0,
                            }}
                        >
                            Fetching your cards&apos; move data
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: '#4ade80',
                                    animation: `n-dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                }}
                            />
                        ))}
                    </div>
                    <style>{`@keyframes n-dot-pulse { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
                </div>
            )}

            {/* Sticky bottom bar */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(8,12,16,0.97)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    padding:
                        'max(14px,env(safe-area-inset-bottom,14px)) 16px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 10,
                            fontSize: '0.78rem',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#6b7280',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onStartBattle}
                        disabled={selected.length !== 5 || acting}
                        style={{
                            padding: '10px 36px',
                            borderRadius: 10,
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            background:
                                selected.length === 5
                                    ? 'rgba(248,113,113,0.15)'
                                    : 'rgba(255,255,255,0.04)',
                            border:
                                selected.length === 5
                                    ? '1px solid rgba(248,113,113,0.5)'
                                    : '1px solid rgba(255,255,255,0.08)',
                            color:
                                selected.length === 5 ? '#f87171' : '#374151',
                            cursor:
                                selected.length === 5 && !acting
                                    ? 'pointer'
                                    : 'not-allowed',
                            transition: 'all 200ms',
                        }}
                    >
                        {acting
                            ? 'Starting...'
                            : `Battle${selected.length < 5 ? ` (${selected.length}/5)` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
