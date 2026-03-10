'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { rarityTextStyle } from '@/lib/rarityConfig'

const PokemonViewer = dynamic(() => import('@/components/PokemonViewer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-800 text-xs tracking-widest uppercase animate-pulse">
                loading...
            </div>
        </div>
    ),
})

// ─── types ────────────────────────────────────────────────────────────────────
type Profile = {
    username: string | null
    first_name: string | null
    last_name: string | null
    profile_url: string | null
    coins: number
    level: number
    xp: number
}

type ShowcaseCard = {
    id: string
    card_level: number
    cards: {
        id: string
        name: string
        image_url: string
        rarity: string
        national_pokedex_number: number
    }
}

// ─── mock data ────────────────────────────────────────────────────────────────
const MOCK_FRIENDS = [
    {
        id: 1,
        name: 'Ash K.',
        avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    },
    {
        id: 2,
        name: 'Misty W.',
        avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/120.png',
    },
    {
        id: 3,
        name: 'Brock H.',
        avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png',
    },
]

const MOCK_ACHIEVEMENTS = [
    {
        id: 1,
        icon: '🎴',
        name: 'First Pull',
        desc: 'Opened your first pack',
        earned: true,
    },
    {
        id: 2,
        icon: '⭐',
        name: 'Rising Star',
        desc: 'Reached level 5',
        earned: true,
    },
    {
        id: 3,
        icon: '🔮',
        name: 'Rare Finder',
        desc: 'Pulled a Rare or higher',
        earned: true,
    },
    { id: 4, icon: '👑', name: 'Legend', desc: '???', earned: false },
    { id: 5, icon: '💎', name: 'Collector', desc: '???', earned: false },
]

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
    return (
        <span
            className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{
                fontSize: '0.62rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color,
            }}
        >
            {children}
        </span>
    )
}

function SectionHeader({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 mb-2.5">
            <span
                className="text-gray-400 font-semibold uppercase tracking-widest"
                style={{ fontSize: '0.6rem' }}
            >
                {label}
            </span>
            <div
                className="flex-1 h-px"
                style={{ background: 'rgba(255,255,255,0.08)' }}
            />
        </div>
    )
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function ProfileView({
    profile,
    showcaseCard,
}: {
    profile: Profile | null
    showcaseCard: ShowcaseCard | null
}) {
    const rarity = showcaseCard?.cards.rarity ?? 'Common'

    const level = profile?.level ?? 1
    const xp = profile?.xp ?? 0
    const xpNeeded = level * 100
    const xpPct = Math.min((xp / xpNeeded) * 100, 100)

    return (
        <div
            className="flex gap-5 items-center justify-center"
            style={{
                minHeight: 'calc(100vh - 64px)',
                background: '#08080d',
                color: '#fff',
                padding: '20px 24px',
            }}
        >
            {/* ── LEFT: showcase column ────────────────────────────────────── */}
            <div
                className="flex flex-col flex-shrink-0"
                style={{ width: 300, gap: 12 }}
            >
                {/* Viewer */}
                <div
                    className="relative rounded-2xl overflow-hidden"
                    style={{ width: 300, height: 460 }}
                >
                    {showcaseCard ? (
                        <PokemonViewer
                            pokemonName={showcaseCard.cards.name}
                            rarity={rarity}
                            cardImageUrl={showcaseCard.cards.image_url}
                            dexNumber={showcaseCard.cards.national_pokedex_number}
                        />
                    ) : (
                        <div
                            className="w-full h-full flex flex-col items-center justify-center gap-4"
                            style={{
                                background: 'rgba(255,255,255,0.015)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            <span
                                className="text-gray-700"
                                style={{ fontSize: '2rem' }}
                            >
                                ?
                            </span>
                            <p
                                className="text-gray-700 uppercase tracking-widest"
                                style={{ fontSize: '0.55rem' }}
                            >
                                no showcase set
                            </p>
                            <Link
                                href="/dashboard/bag"
                                className="px-4 py-1.5 rounded-full transition-all active:scale-95"
                                style={{
                                    fontSize: '0.6rem',
                                    background: 'rgba(96,165,250,0.08)',
                                    border: '1px solid rgba(96,165,250,0.25)',
                                    color: '#60a5fa',
                                }}
                            >
                                + favorite a card
                            </Link>
                        </div>
                    )}
                </div>

                {/* Name + tags + change button — below the viewer */}
                {showcaseCard && (
                    <div className="flex flex-col gap-2 px-1">
                        <p
                            className="text-white font-bold"
                            style={{ fontSize: '1.15rem', lineHeight: 1.2 }}
                        >
                            {showcaseCard.cards.name}{' '}
                            <span
                                className="font-mono px-2 py-0.5 rounded-md"
                                style={{
                                    fontSize: '0.8rem',
                                    color: '#9ca3af',
                                }}
                            >
                                #
                                {String(
                                    showcaseCard.cards.national_pokedex_number,
                                ).padStart(3, '0')}
                            </span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge>
                                <span style={rarityTextStyle(rarity)}>{rarity}</span>
                            </Badge>
                            <Badge color="#40bd27">Level {showcaseCard.card_level}</Badge>
                        </div>
                        <Link
                            href="/dashboard/bag"
                            className="self-start px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95 text-[#6b7280] bg-white/5 border border-white/10 hover:bg-blue-400/15 hover:border-blue-400/45 hover:text-blue-300 hover:scale-105"
                            style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}
                        >
                            change favorites
                        </Link>
                    </div>
                )}
            </div>

            {/* ── RIGHT: Info panel ───────────────────────────────────────── */}
            <div
                className="flex flex-col overflow-y-auto rounded-2xl"
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    scrollbarWidth: 'none',
                    padding: '24px 22px',
                    gap: 18,
                    width: 340,
                    minHeight: 580,
                    flexShrink: 0,
                }}
            >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                    {profile?.profile_url ? (
                        <Image
                            src={profile.profile_url}
                            alt="avatar"
                            width={52}
                            height={52}
                            className="rounded-full flex-shrink-0 object-cover"
                            style={{
                                border: '2px solid rgba(255,255,255,0.12)',
                            }}
                        />
                    ) : (
                        <div
                            className="rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{
                                width: 52,
                                height: 52,
                                background: 'rgba(255,255,255,0.06)',
                                border: '2px solid rgba(255,255,255,0.1)',
                                fontSize: '1.3rem',
                                color: '#9ca3af',
                            }}
                        >
                            ?
                        </div>
                    )}
                    <div className="min-w-0">
                        <p
                            className="text-white font-semibold leading-tight truncate"
                            style={{ fontSize: '1.05rem' }}
                        >
                            {profile?.first_name
                                ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
                                : (profile?.username ?? 'Trainer')}
                        </p>
                        <p
                            className="text-gray-400"
                            style={{ fontSize: '0.75rem' }}
                        >
                            @{profile?.username ?? 'unknown'}
                        </p>
                    </div>
                </div>

                {/* Level + XP + Coins */}
                <div
                    className="rounded-xl px-4 py-3.5 flex flex-col gap-3"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="text-white font-bold"
                                style={{ fontSize: '0.95rem' }}
                            >
                                Level {level}
                            </span>
                            <span
                                className="text-gray-400 font-mono"
                                style={{ fontSize: '0.72rem' }}
                            >
                                {xp} / {xpNeeded} xp
                            </span>
                        </div>
                        <span
                            className="text-yellow-300 font-mono font-semibold"
                            style={{ fontSize: '0.9rem' }}
                        >
                            🪙 {(profile?.coins ?? 0).toLocaleString()}
                        </span>
                    </div>
                    <div
                        className="w-full rounded-full overflow-hidden"
                        style={{
                            height: 5,
                            background: 'rgba(255,255,255,0.08)',
                        }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${xpPct}%`,
                                background:
                                    'linear-gradient(90deg, #60a5fa, #a78bfa)',
                            }}
                        />
                    </div>
                </div>

                {/* Friends */}
                <div>
                    <SectionHeader label="Friends" />
                    <div className="flex items-center gap-3 flex-wrap">
                        {MOCK_FRIENDS.map((friend) => (
                            <div
                                key={friend.id}
                                className="flex flex-col items-center gap-1.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                            >
                                <div
                                    className="rounded-full overflow-hidden flex items-center justify-center"
                                    style={{
                                        width: 44,
                                        height: 44,
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1.5px solid rgba(255,255,255,0.12)',
                                    }}
                                >
                                    <img
                                        src={friend.avatar}
                                        alt={friend.name}
                                        style={{
                                            width: 34,
                                            height: 34,
                                            imageRendering: 'pixelated',
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-gray-400"
                                    style={{ fontSize: '0.6rem' }}
                                >
                                    {friend.name}
                                </span>
                            </div>
                        ))}
                        <div className="flex flex-col items-center gap-1.5 opacity-40">
                            <div
                                className="rounded-full flex items-center justify-center"
                                style={{
                                    width: 44,
                                    height: 44,
                                    border: '1.5px dashed rgba(255,255,255,0.15)',
                                    color: '#6b7280',
                                    fontSize: '1.1rem',
                                }}
                            >
                                +
                            </div>
                            <span
                                className="text-gray-500"
                                style={{ fontSize: '0.6rem' }}
                            >
                                add
                            </span>
                        </div>
                    </div>
                </div>

                {/* Collection */}
                <div>
                    <SectionHeader label="Collection" />
                    <div
                        className="w-full rounded-xl flex items-center justify-between px-4 py-3"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            opacity: 0.6,
                        }}
                        title="Coming soon"
                    >
                        <div className="flex flex-col items-start gap-0.5">
                            <span
                                className="text-gray-100 font-medium"
                                style={{ fontSize: '0.88rem' }}
                            >
                                View Binder
                            </span>
                            <span
                                className="text-gray-500"
                                style={{ fontSize: '0.65rem' }}
                            >
                                browse your full collection
                            </span>
                        </div>
                        <span
                            className="text-gray-500 uppercase tracking-widest"
                            style={{ fontSize: '0.58rem' }}
                        >
                            soon
                        </span>
                    </div>
                </div>

                {/* Achievements */}
                <div className="flex-1">
                    <SectionHeader label="Achievements" />
                    <div className="flex flex-wrap gap-2.5">
                        {MOCK_ACHIEVEMENTS.map((badge) => (
                            <div
                                key={badge.id}
                                className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-3"
                                style={{
                                    background: badge.earned
                                        ? 'rgba(255,255,255,0.05)'
                                        : 'rgba(255,255,255,0.015)',
                                    border: badge.earned
                                        ? '1px solid rgba(255,255,255,0.12)'
                                        : '1px solid rgba(255,255,255,0.04)',
                                    opacity: badge.earned ? 1 : 0.35,
                                    minWidth: 60,
                                }}
                                title={badge.desc}
                            >
                                <span
                                    style={{
                                        fontSize: '1.4rem',
                                        filter: badge.earned
                                            ? 'none'
                                            : 'grayscale(1)',
                                    }}
                                >
                                    {badge.icon}
                                </span>
                                <span
                                    className="text-center"
                                    style={{
                                        fontSize: '0.58rem',
                                        lineHeight: 1.3,
                                        color: badge.earned
                                            ? '#e5e7eb'
                                            : '#6b7280',
                                    }}
                                >
                                    {badge.earned ? badge.name : '???'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
