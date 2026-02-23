'use client'
import { useState } from 'react'
import FlipCard from './FlipCard'
import { RARITY_GLOW } from '@/lib/rarityConfig'

type Card = {
    id: string
    name: string
    image_url: string
    rarity: string
    isNew: boolean
}

export default function PackOpening() {
    const [shaking, setShaking] = useState(false)
    const [tearing, setTearing] = useState(false)
    const [opening, setOpening] = useState(false)
    const [phase, setPhase] = useState<'idle' | 'revealing' | 'done'>('idle')
    const [cards, setCards] = useState<Card[]>([])
    const [revealedCount, setRevealedCount] = useState(0)

    async function handleClick() {
        if (shaking || opening) return
        setShaking(true)

        //const res = await fetch('/api/open-pack', { method: 'POST' })
        //const data = await res.json()
        //setCards(data.cards)
        setCards([
            {
                id: 'sv10.5b-034',
                name: 'Zekrom ex',
                image_url:
                    'https://assets.tcgdex.net/en/sv/sv10.5b/034/low.webp',
                rarity: 'Legendary',
                isNew: true,
            },
            {
                id: 'sv10.5b-001',
                name: 'Snivy',
                image_url:
                    'https://assets.tcgdex.net/en/sv/sv10.5b/001/low.webp',
                rarity: 'Common',
                isNew: false,
            },
            {
                id: 'sv10.5b-002',
                name: 'Servine',
                image_url:
                    'https://assets.tcgdex.net/en/sv/sv10.5b/002/low.webp',
                rarity: 'Common',
                isNew: true,
            },
            {
                id: 'sv10.5b-003',
                name: 'Serperior ex',
                image_url:
                    'https://assets.tcgdex.net/en/sv/sv10.5b/003/low.webp',
                rarity: 'Rare',
                isNew: false,
            },
            {
                id: 'sv10.5b-028',
                name: 'Kyurem ex',
                image_url:
                    'https://assets.tcgdex.net/en/sv/sv10.5b/028/low.webp',
                rarity: 'Epic',
                isNew: true,
            },
        ])
        // shake is done, now tear
        setShaking(false)
        setTearing(true)

        setTimeout(() => {
            setTearing(false)
            setOpening(true)

            setTimeout(() => {
                setPhase('revealing')
            }, 600) // fade out duration
        }, 400) // tear duration
    }
    function handleReveal() {
        const next = revealedCount + 1
        setRevealedCount(next)
        if (next === cards.length) {
            setTimeout(() => setPhase('done'), 700)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center mt-12">
            {/* Pack */}
            {phase === 'idle' && (
                <>
                    <div
                        className={`cursor-pointer animate-subtle-pulse hover:scale-105 ${shaking ? 'animate-shake' : ''} ${opening ? 'animate-fade-out' : ''}`}
                        style={{
                            filter: 'drop-shadow(0 0 20px rgba(228, 228, 228, 0.99))',
                            transform: tearing
                                ? 'scale(1.12) rotate(2deg)'
                                : undefined,
                            transition: tearing
                                ? 'transform 300ms ease-in-out'
                                : undefined,
                        }}
                    >
                        <img
                            src="/packs/black-bolt.jpg"
                            alt="Black Bolt Pack"
                            onClick={handleClick}
                            className="cursor-pointer"
                            style={{ height: '500px', width: 'auto' }}
                        />
                    </div>
                    <div className="flex items-center justify-center mt-8">
                        <button className="border border-gray-600 text-gray-300 px-8 py-3 rounded-xl text-lg font-medium tracking-wide transition-all duration-200 hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95">
                            Open Pack
                        </button>
                    </div>
                </>
            )}

            {/* Card stack */}
            {phase === 'revealing' && (
                <div
                    className="relative flex items-center justify-center mt-24"
                    style={{ height: '400px', width: '280px' }}
                >
                    {cards.map((card, index) => {
                        const isTop = index === revealedCount
                        const isRevealed = index < revealedCount
                        if (isRevealed) return null
                        return (
                            <div
                                key={`${card.id}-${index}`}
                                className="absolute"
                                style={{
                                    transform: `translateY(${(index - revealedCount) * -6}px) rotate(${(index - revealedCount) * -1}deg)`,
                                    zIndex: isTop ? 10 : 10 - index,
                                    pointerEvents: isTop ? 'auto' : 'none',
                                }}
                            >
                                <FlipCard
                                    card={card}
                                    onReveal={isTop ? handleReveal : () => {}}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {phase === 'done' && (
                <div className="flex flex-col items-center gap-4 mt-8">
                    <div className="relative">
                        <img
                            src={cards[revealedCount % cards.length].image_url}
                            alt={cards[revealedCount % cards.length].name}
                            className="rounded-xl"
                            style={{
                                height: '364px',
                                width: 'auto',
                                boxShadow:
                                    RARITY_GLOW[
                                        cards[revealedCount % cards.length]
                                            .rarity
                                    ] === 'rainbow'
                                        ? undefined
                                        : `0 0 20px 4px rgba(${RARITY_GLOW[cards[revealedCount % cards.length].rarity] ?? '156,163,175'}, 0.6)`,
                            }}
                        />
                    </div>

                    {/* Card metadata */}
                    <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-lg tracking-wide">
                            {cards[revealedCount % cards.length].name}
                        </p>
                        {cards[revealedCount % cards.length].isNew && (
                            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full">
                                NEW
                            </span>
                        )}
                    </div>
                    {/* Navigation */}
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() =>
                                setRevealedCount(
                                    (prev) =>
                                        (prev - 1 + cards.length) %
                                        cards.length,
                                )
                            }
                            className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                        >
                            ←
                        </button>
                        <span className="text-gray-400 text-sm">
                            {(revealedCount % cards.length) + 1} /{' '}
                            {cards.length}
                        </span>
                        <button
                            onClick={() =>
                                setRevealedCount(
                                    (prev) => (prev + 1) % cards.length,
                                )
                            }
                            className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                        >
                            →
                        </button>
                    </div>

                    <button className="border border-gray-600 text-gray-300 px-6 py-2 rounded-lg text-sm hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all">
                        Add to Bag
                    </button>
                </div>
            )}
        </div>
    )
}
