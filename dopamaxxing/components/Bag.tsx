'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    RARITY_ORDER,
    RARITY_ABBREV,
    isRainbow,
    rarityGlowRgb,
    rarityGlowShadow,
    rarityTextStyle,
    xpToNextLevel,
    type Rarity,
} from '@/lib/rarityConfig'

// ─── types ────────────────────────────────────────────────────────────────────
type UserCard = {
    id: string
    card_id: string
    card_level: number
    card_xp: number
    is_favorited: boolean
    worth: number
    is_hot: boolean
    cards: {
        id: string
        name: string
        image_url: string
        rarity: string
        national_pokedex_number: number
        hp: number
    }
}

// ─── constants ────────────────────────────────────────────────────────────────
const FILTERS = ['All', ...RARITY_ORDER]


function rarityClassName(rarity: string): string {
    return rarity === 'Celestial' ? 'celestial-pulse' : ''
}

// ─── card tile ────────────────────────────────────────────────────────────────
function CardTile({
    uc,
    isSelected,
    onClick,
}: {
    uc: UserCard
    isSelected: boolean
    onClick: () => void
}) {
    const rarity = uc.cards.rarity as Rarity
    const rainbow = isRainbow(rarity)
    const glowRgb = rarityGlowRgb(rarity)
    const abbrev = RARITY_ABBREV[rarity] ?? rarity[0]
    const baseShadow = isSelected
        ? rarityGlowShadow(rarity, 'md')
        : rarityGlowShadow(rarity, 'sm')

    return (
        <div
            onClick={onClick}
            className="relative cursor-pointer rounded-lg overflow-hidden"
            style={{
                transition: 'transform 110ms ease, box-shadow 110ms ease',
                boxShadow: baseShadow,
                outline: isSelected
                    ? `2px solid rgba(${glowRgb}, 0.7)`
                    : 'none',
                outlineOffset: '2px',
            }}
            onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.transform = 'scale(1.04)'
                e.currentTarget.style.boxShadow = rarityGlowShadow(rarity, 'md')
            }}
            onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = baseShadow
            }}
        >
            <img
                src={uc.cards.image_url}
                alt={uc.cards.name}
                className="w-full block"
                style={{ aspectRatio: '2/3', objectFit: 'cover' }}
                loading="lazy"
            />

            <div
                className={`absolute top-1 left-1 px-1 rounded font-bold ${rarityClassName(rarity)}`}
                style={{
                    fontSize: '0.48rem',
                    lineHeight: 1.7,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                }}
            >
                {rainbow ? (
                    <span style={rarityTextStyle(rarity)}>Rarity: {abbrev}</span>
                ) : (
                    <span style={{ color: `rgba(${glowRgb}, 1)` }}>
                        Rarity: {abbrev}
                    </span>
                )}
            </div>

            {/* level badge */}
            <div
                className="absolute top-1 right-1 px-1 rounded font-mono font-bold"
                style={{
                    fontSize: '0.48rem',
                    lineHeight: 1.7,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    color: '#d1d5db',
                }}
            >
                Lv {uc.card_level}
            </div>

            {/* hot badge */}
            {uc.is_hot && (
                <div
                    className="absolute bottom-1 left-1"
                    style={{ fontSize: '0.55rem' }}
                >
                    🔥
                </div>
            )}

            {/* favorite star */}
            {uc.is_favorited && (
                <div
                    className="absolute bottom-1 right-1 text-yellow-400"
                    style={{ fontSize: '0.48rem' }}
                >
                    ★
                </div>
            )}

            {/* rainbow shimmer */}
            {rainbow && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.09) 50%, transparent 60%)',
                        backgroundSize: '300% 100%',
                        animation: 'shine 2.5s linear infinite',
                    }}
                />
            )}
        </div>
    )
}

// ─── sell button ──────────────────────────────────────────────────────────────
function SellButton({ uc, onSell }: { uc: UserCard; onSell: () => void }) {
    const rarity = uc.cards.rarity as Rarity
    const rainbow = isRainbow(rarity)
    const glowRgb = rarityGlowRgb(rarity)

    return (
        <div className="relative mt-2">
            {/* fire ring for hot cards */}
            {uc.is_hot && (
                <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                        background: 'transparent',
                        boxShadow:
                            '0 0 12px 3px rgba(251,146,60,0.7), 0 0 24px 6px rgba(239,68,68,0.4)',
                        animation: 'hotPulse 1.2s ease-in-out infinite',
                    }}
                />
            )}
            <button
                onClick={onSell}
                className="relative w-full py-1.5 rounded-lg font-semibold transition-all active:scale-95"
                style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.06em',
                    background: uc.is_hot
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,146,60,0.15))'
                        : rainbow
                          ? 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(244,114,182,0.1))'
                          : `rgba(${glowRgb}, 0.08)`,
                    border: uc.is_hot
                        ? '1px solid rgba(251,146,60,0.5)'
                        : rainbow
                          ? '1px solid rgba(168,85,247,0.4)'
                          : `1px solid rgba(${glowRgb}, 0.3)`,
                    color: uc.is_hot
                        ? '#fb923c'
                        : rainbow
                          ? '#f472b4'
                          : `rgba(${glowRgb}, 0.9)`,
                }}
            >
                {uc.is_hot ? '🔥 ' : ''}sell · {uc.worth} coins
            </button>
        </div>
    )
}

// ─── card stats (shared by sidebar + overlay) ─────────────────────────────────
function CardStats({
    uc,
    onClose,
    onSell,
    onToggleFavorite,
    mode,
}: {
    uc: UserCard
    onClose: () => void
    onSell: () => void
    onToggleFavorite: () => void
    mode: 'sidebar' | 'overlay'
}) {
    const rarity = uc.cards.rarity as Rarity
    const rainbow = isRainbow(rarity)
    const glowRgb = rarityGlowRgb(rarity)
    const xpNeeded = xpToNextLevel(rarity, uc.card_level)
    const xpPct = Math.min(100, (uc.card_xp / xpNeeded) * 100)
    const borderColor = rainbow
        ? 'rgba(168,85,247,0.2)'
        : `rgba(${glowRgb}, 0.18)`
    const barBg = rainbow
        ? 'linear-gradient(90deg,#f87171,#facc15,#4ade80,#60a5fa,#a855f7)'
        : `rgba(${glowRgb}, 0.9)`

    // colored stat rows
    const stats = [
        {
            label: 'pokédex',
            value: `#${String(uc.cards.national_pokedex_number).padStart(3, '0')}`,
            color: '#9ca3af',
        },
        { label: 'hp', value: uc.cards.hp, color: '#f87171' },
        { label: 'level', value: uc.card_level, color: '#60a5fa' },
        { label: 'worth', value: `${uc.worth} 🪙`, color: '#eab308' },
    ]

    const imageBlock = (
        <img
            src={uc.cards.image_url}
            alt={uc.cards.name}
            className="w-full rounded-xl"
            style={{
                aspectRatio: '2/3',
                objectFit: 'cover',
                boxShadow: rarityGlowShadow(rarity, 'lg'),
            }}
        />
    )

    const infoBlock = (
        <div className="flex flex-col flex-1 min-w-0">
            {/* name + rarity */}
            <div className="mb-4">
                <button
                    onClick={onToggleFavorite}
                    className="flex items-center gap-2 mb-2 transition-all hover:scale-105 active:scale-95"
                    style={{ cursor: 'pointer' }}
                >
                    <span style={{
                        fontSize: '1.15rem',
                        color: '#facc15',
                        filter: uc.is_favorited
                            ? 'drop-shadow(0 0 6px rgba(250,204,21,0.9))'
                            : 'none',
                        transition: 'filter 0.15s ease',
                        lineHeight: 1,
                    }}>
                        {uc.is_favorited ? '★' : '☆'}
                    </span>
                    <span style={{
                        fontSize: '0.62rem',
                        letterSpacing: '0.04em',
                        color: uc.is_favorited ? '#facc15' : '#d1d5db',
                        transition: 'color 0.15s ease',
                    }}>
                        {uc.is_favorited ? 'showcased' : 'add to showcase'}
                    </span>
                </button>
                {uc.is_hot && (
                    <span
                        className="block mb-1"
                        style={{ fontSize: '0.6rem', color: '#fb923c' }}
                    >
                        🔥 hot market pull
                    </span>
                )}
                <h3
                    className="text-white font-bold leading-snug mb-1.5"
                    style={{
                        fontSize: mode === 'overlay' ? '1.3rem' : '0.95rem',
                    }}
                >
                    {uc.cards.name}
                </h3>
                <span
                    className={`font-bold uppercase tracking-widest ${rarityClassName(rarity)}`}
                    style={{ fontSize: '0.58rem', ...rarityTextStyle(rarity) }}
                >
                    {rarity}
                </span>
            </div>

            {/* stat rows */}
            <div style={{ borderTop: `1px solid ${borderColor}` }}>
                {stats.map(({ label, value, color }) => (
                    <div
                        key={label}
                        className="flex justify-between items-center py-2.5"
                        style={{ borderBottom: `1px solid ${borderColor}` }}
                    >
                        <span
                            className="font-semibold uppercase tracking-widest text-gray-600"
                            style={{ fontSize: '0.58rem' }}
                        >
                            {label}
                        </span>
                        <span
                            className="font-mono font-bold"
                            style={{
                                fontSize:
                                    mode === 'overlay' ? '0.95rem' : '0.78rem',
                                color,
                            }}
                        >
                            {value}
                        </span>
                    </div>
                ))}

                {/* xp bar */}
                <div className="py-3">
                    <div className="flex justify-between mb-2">
                        <span
                            className="font-semibold uppercase tracking-widest text-gray-600"
                            style={{ fontSize: '0.58rem' }}
                        >
                            xp
                        </span>
                        <span
                            className="font-mono"
                            style={{ fontSize: '0.58rem', color: '#4ade80' }}
                        >
                            {uc.card_xp} / {xpNeeded}
                        </span>
                    </div>
                    <div
                        className="w-full rounded-full overflow-hidden"
                        style={{
                            height: 4,
                            background: 'rgba(255,255,255,0.05)',
                        }}
                    >
                        <div
                            className="h-full rounded-full"
                            style={{ width: `${xpPct}%`, background: barBg }}
                        />
                    </div>
                </div>

                {/* sell button */}
                <SellButton uc={uc} onSell={onSell} />
            </div>
        </div>
    )

    if (mode === 'overlay') {
        return (
            <div className="flex gap-8 w-full">
                <div style={{ width: 240, flexShrink: 0 }}>{imageBlock}</div>
                {infoBlock}
            </div>
        )
    }

    // sidebar mode — compact layout so sell button is never cut off
    return (
        <div className="flex flex-col h-full">
            <div
                className="flex items-center justify-between px-4 pt-3 pb-2"
                style={{ borderBottom: `1px solid ${borderColor}` }}
            >
                <span
                    className="text-gray-700 uppercase tracking-widest"
                    style={{ fontSize: '0.55rem' }}
                >
                    card info
                </span>
                <button
                    onClick={onClose}
                    className="text-gray-700 hover:text-white transition-colors"
                    style={{ fontSize: '0.9rem' }}
                >
                    ✕
                </button>
            </div>
            {/* full card image — no cropping */}
            <div className="px-4 pt-3 pb-2">
                <img
                    src={uc.cards.image_url}
                    alt={uc.cards.name}
                    className="w-full rounded-lg"
                    style={{
                        objectFit: 'contain',
                        boxShadow: rarityGlowShadow(rarity, 'md'),
                    }}
                />
            </div>
            <div className="px-4 pb-4 flex-1 flex flex-col">
                {/* name + tags */}
                <div className="mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {uc.is_hot && (
                            <span
                                style={{
                                    fontSize: '0.55rem',
                                    color: '#fb923c',
                                }}
                            >
                                🔥
                            </span>
                        )}
                        <span
                            className={`font-bold uppercase tracking-widest ${rarityClassName(rarity)}`}
                            style={{
                                fontSize: '0.55rem',
                                ...rarityTextStyle(rarity),
                            }}
                        >
                            {rarity}
                        </span>
                    </div>
                    <h3
                        className="text-white font-bold leading-snug"
                        style={{ fontSize: '0.85rem' }}
                    >
                        {uc.cards.name}
                    </h3>
                </div>
                {/* compact stat rows */}
                <div style={{ borderTop: `1px solid ${borderColor}` }}>
                    {stats.map(({ label, value, color }) => (
                        <div
                            key={label}
                            className="flex justify-between items-center py-1.5"
                            style={{ borderBottom: `1px solid ${borderColor}` }}
                        >
                            <span
                                className="font-semibold uppercase tracking-widest text-gray-600"
                                style={{ fontSize: '0.52rem' }}
                            >
                                {label}
                            </span>
                            <span
                                className="font-mono font-bold"
                                style={{ fontSize: '0.72rem', color }}
                            >
                                {value}
                            </span>
                        </div>
                    ))}
                    {/* xp bar */}
                    <div className="py-2">
                        <div className="flex justify-between mb-1.5">
                            <span
                                className="font-semibold uppercase tracking-widest text-gray-600"
                                style={{ fontSize: '0.55rem' }}
                            >
                                xp
                            </span>
                            <span
                                className="font-mono"
                                style={{
                                    fontSize: '0.62rem',
                                    color: '#4ade80',
                                }}
                            >
                                {uc.card_xp} / {xpNeeded}
                            </span>
                        </div>
                        <div
                            className="w-full rounded-full overflow-hidden"
                            style={{
                                height: 3,
                                background: 'rgba(255,255,255,0.05)',
                            }}
                        >
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${xpPct}%`,
                                    background: barBg,
                                }}
                            />
                        </div>
                    </div>
                    <SellButton uc={uc} onSell={onSell} />
                    <button
                        onClick={onToggleFavorite}
                        className="w-full py-1.5 rounded-lg font-semibold transition-all active:scale-95 hover:scale-[1.02] mt-2"
                        style={{
                            fontSize: '0.62rem',
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                            background: uc.is_favorited
                                ? 'rgba(250,204,21,0.08)'
                                : 'rgba(255,255,255,0.04)',
                            border: uc.is_favorited
                                ? '1px solid rgba(250,204,21,0.35)'
                                : '1px solid rgba(255,255,255,0.08)',
                            color: uc.is_favorited ? '#facc15' : '#9ca3af',
                        }}
                    >
                        {uc.is_favorited ? '★ remove from showcase' : '☆ add to showcase'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── bag page ─────────────────────────────────────────────────────────────────
export default function BagPage({ userCards: initialCards }: { userCards: UserCard[] }) {
    const [userCards, setUserCards] = useState(initialCards)
    const [filters, setFilters] = useState<Set<string>>(new Set(['All']))
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<'rarity' | 'level' | 'name' | 'price'>(
        'rarity',
    )
    const [selected, setSelected] = useState<UserCard | null>(null)
    const [isWide, setIsWide] = useState(false)
    const headerRef = useRef<HTMLDivElement>(null)
    const [headerHeight, setHeaderHeight] = useState(0)

    useEffect(() => {
        const check = () => setIsWide(window.innerWidth >= 1280)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight)
    }, [filters, search, sort])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelected(null)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const filtered = userCards
        .filter((uc) => filters.has('All') || filters.has(uc.cards.rarity))
        .filter((uc) =>
            uc.cards.name.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => {
            if (sort === 'rarity')
                return (
                    RARITY_ORDER.indexOf(a.cards.rarity as Rarity) -
                    RARITY_ORDER.indexOf(b.cards.rarity as Rarity)
                )
            if (sort === 'level') return b.card_level - a.card_level
            if (sort === 'price') return b.worth - a.worth
            return a.cards.name.localeCompare(b.cards.name)
        })

    function handleSell() {
        // wire up to /api/buyback-card
        console.log('sell', selected?.id)
    }

    async function handleToggleFavorite() {
        if (!selected) return
        const next = !selected.is_favorited
        const supabase = createClient()

        if (next) {
            // Only 1 favorite allowed — unfavorite all others first
            const { data: { user } } = await supabase.auth.getUser()
            await supabase
                .from('user_cards')
                .update({ is_favorited: false })
                .eq('user_id', user?.id ?? '')
                .neq('id', selected.id)
        }

        const { error } = await supabase
            .from('user_cards')
            .update({ is_favorited: next })
            .eq('id', selected.id)

        if (!error) {
            const updated = { ...selected, is_favorited: next }
            setUserCards((prev) =>
                prev.map((uc) => ({
                    ...uc,
                    is_favorited:
                        uc.id === selected.id ? next : next ? false : uc.is_favorited,
                })),
            )
            setSelected(updated)
        }
    }

    return (
        <>
            <div className="min-h-screen bg-black text-white pb-24">
                <div className="mx-auto" style={{ maxWidth: 900 }}>
                    {/* sticky header */}
                    <div
                        ref={headerRef}
                        className="sticky top-0 z-30 px-4 pt-4 pb-3"
                        style={{
                            background: 'rgba(0,0,0,0.92)',
                            backdropFilter: 'blur(16px)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h1 className="text-white font-bold text-lg tracking-tight">
                                Bag
                            </h1>
                            <span className="text-gray-700 text-xs font-mono">
                                {filtered.length} cards
                            </span>
                        </div>

                        <input
                            type="text"
                            placeholder="search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-white placeholder-gray-700 outline-none transition-colors mb-3"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                fontSize: '0.8rem',
                            }}
                            onFocus={(e) =>
                                (e.currentTarget.style.borderColor =
                                    'rgba(255,255,255,0.15)')
                            }
                            onBlur={(e) =>
                                (e.currentTarget.style.borderColor =
                                    'rgba(255,255,255,0.07)')
                            }
                        />

                        {/* sort buttons */}
                        <div className="flex gap-1.5 mb-2.5">
                            {(
                                ['rarity', 'level', 'name', 'price'] as const
                            ).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSort(s)}
                                    className="capitalize transition-all px-3 py-1 rounded-full"
                                    style={{
                                        fontSize: '0.65rem',
                                        background:
                                            sort === s
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'transparent',
                                        border:
                                            sort === s
                                                ? '1px solid rgba(255,255,255,0.15)'
                                                : '1px solid rgba(255,255,255,0.05)',
                                        color: sort === s ? '#fff' : '#4b5563',
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* rarity filter pills — multi-select */}
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                            {FILTERS.map((f) => {
                                const isActive = filters.has(f)
                                const rainbow = isRainbow(f as Rarity)
                                const glowRgb = rarityGlowRgb(f)
                                function toggle() {
                                    setFilters((prev) => {
                                        const next = new Set(prev)
                                        if (f === 'All') return new Set(['All'])
                                        next.delete('All')
                                        if (next.has(f)) {
                                            next.delete(f)
                                            if (next.size === 0) next.add('All')
                                        } else {
                                            next.add(f)
                                        }
                                        return next
                                    })
                                }
                                return (
                                    <button
                                        key={f}
                                        onClick={toggle}
                                        className="flex-shrink-0 px-3 py-1 rounded-full transition-all"
                                        style={{
                                            fontSize: '0.62rem',
                                            border:
                                                isActive &&
                                                f !== 'All' &&
                                                !rainbow
                                                    ? `1px solid rgba(${glowRgb}, 0.6)`
                                                    : isActive
                                                      ? '1px solid rgba(255,255,255,0.2)'
                                                      : '1px solid rgba(255,255,255,0.08)',
                                            background:
                                                isActive &&
                                                f !== 'All' &&
                                                !rainbow
                                                    ? `rgba(${glowRgb}, 0.1)`
                                                    : isActive
                                                      ? 'rgba(255,255,255,0.06)'
                                                      : 'transparent',
                                            color:
                                                isActive &&
                                                f !== 'All' &&
                                                !rainbow
                                                    ? `rgba(${glowRgb}, 1)`
                                                    : isActive
                                                      ? '#fff'
                                                      : '#6b7280',
                                        }}
                                    >
                                        {f}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* grid + sidebar */}
                    <div className="flex relative">
                        <div
                            className="flex-1 px-3 pt-4 pb-6"
                            style={{ minWidth: 0 }}
                        >
                            {filtered.length === 0 ? (
                                <div className="flex items-center justify-center mt-24">
                                    <p className="text-gray-800 text-sm">
                                        no cards found
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="grid gap-2"
                                    style={{
                                        gridTemplateColumns: 'repeat(5, 1fr)',
                                    }}
                                >
                                    {filtered.map((uc) => (
                                        <CardTile
                                            key={uc.id}
                                            uc={uc}
                                            isSelected={selected?.id === uc.id}
                                            onClick={() =>
                                                setSelected((prev) =>
                                                    prev?.id === uc.id
                                                        ? null
                                                        : uc,
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* sidebar */}
                        {!isWide && selected && (
                            <div
                                className="sidebar-anim scrollbar-none"
                                style={{
                                    width: 220,
                                    flexShrink: 0,
                                    position: 'fixed',
                                    top: headerHeight,
                                    bottom: 0,
                                    right: `max(0px, calc((100vw - 900px) / 2))`,
                                    overflowY: 'auto',
                                    background: 'rgba(10,10,16,0.97)',
                                    borderLeft:
                                        '1px solid rgba(255,255,255,0.06)',
                                    zIndex: 20,
                                }}
                            >
                                <CardStats
                                    uc={selected}
                                    onClose={() => setSelected(null)}
                                    onSell={handleSell}
                                    onToggleFavorite={handleToggleFavorite}
                                    mode="sidebar"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* fullscreen overlay */}
            {isWide && selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-8"
                    style={{
                        background: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(20px)',
                    }}
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="overlay-anim relative w-full rounded-2xl"
                        style={{
                            maxWidth: 680,
                            background: 'rgba(10,10,16,0.99)',
                            border: `1px solid rgba(${rarityGlowRgb(selected.cards.rarity)}, 0.25)`,
                            boxShadow: rarityGlowShadow(
                                selected.cards.rarity as Rarity,
                                'lg',
                            ),
                            padding: '2rem',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelected(null)}
                            className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors z-10"
                            style={{ fontSize: '1rem' }}
                        >
                            ✕
                        </button>
                        <CardStats
                            uc={selected}
                            onClose={() => setSelected(null)}
                            onSell={handleSell}
                            onToggleFavorite={handleToggleFavorite}
                            mode="overlay"
                        />
                    </div>
                </div>
            )}
        </>
    )
}
