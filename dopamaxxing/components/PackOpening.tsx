'use client'
import { useState } from 'react'
import FlipCard from './FlipCard'
import { RARITY_GLOW } from '@/lib/rarityConfig'

type Card = {
    id: string
    name: string
    image_url: string
    rarity: string
    national_pokedex_number: number
    worth: number
    isNew: boolean
}

export default function PackOpening() {
    const [shaking, setShaking] = useState(false)
    const [tearing, setTearing] = useState(false)
    const [opening, setOpening] = useState(false)
    const [phase, setPhase] = useState<'idle' | 'revealing' | 'done'>('idle')
    const [cards, setCards] = useState<Card[]>([])

    const [specialActive, setSpecialActive] = useState(false)
    const [specialGlow, setSpecialGlow] = useState('156, 163, 175')
    const [revealedCount, setRevealedCount] = useState(0)

    const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set())
    const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)
    const [doneIndex, setDoneIndex] = useState(0)

    const remainingCards = cards.filter((_, i) => !addedIndices.has(i))

    async function handleClick() {
        if (shaking || opening) return
        setShaking(true)

        const res = await fetch('/api/open-pack', { method: 'POST' })
        const data = await res.json()
        setCards(data.cards)

        setShaking(false)
        setTearing(true)

        setTimeout(() => {
            setTearing(false)
            setOpening(true)
            setTimeout(() => {
                setPhase('revealing')
            }, 600)
        }, 400)
    }

    function handleReveal() {
        const next = revealedCount + 1
        setRevealedCount(next)
        if (next === cards.length) {
            setTimeout(() => setPhase('done'), 700)
        }
    }

    async function handleAddToBag() {
        const card = remainingCards[doneIndex]
        setAnimatingIndex(doneIndex)
        /* await fetch('/api/add-to-bag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: card.id }),
        })*/
    }

    function handleAnimationEnd() {
        if (animatingIndex === null) return

        const card = remainingCards[animatingIndex]
        const realIndex = cards.findIndex((c) => c === card)

        setAddedIndices((prev) => {
            const next = new Set(prev)
            next.add(realIndex)
            return next
        })
        setAnimatingIndex(null)

        const newRemaining = remainingCards.filter(
            (_, i) => i !== animatingIndex,
        )
        if (newRemaining.length === 0) {
            setTimeout(() => {
                setPhase('idle')
                setCards([])
                setRevealedCount(0)
                setAddedIndices(new Set())
                setDoneIndex(0)
            }, 300)
        } else {
            setDoneIndex((prev) => Math.min(prev, newRemaining.length - 1))
        }
    }

    const currentCard = remainingCards[doneIndex]

    return (
        <div className="flex flex-col items-center justify-center mt-12">
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at center, rgba(${specialGlow}, 0.5) 0%, transparent 70%)`,
                    zIndex: 41,
                    opacity: specialActive ? 1 : 0,
                    transition: 'opacity 800ms ease-in-out',
                }}
            />

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
                    style={{ height: '350px', width: '280px' }}
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
                                    zIndex: isTop ? 50 : 50 - index,
                                    pointerEvents: isTop ? 'auto' : 'none',
                                }}
                            >
                                <FlipCard
                                    card={card}
                                    onReveal={isTop ? handleReveal : () => {}}
                                    onSpecialChange={(active, glow) => {
                                        setSpecialActive(active)
                                        setSpecialGlow(glow)
                                    }}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Done phase */}
            {phase === 'done' && remainingCards.length > 0 && currentCard && (
                <div className="flex flex-col items-center gap-4 mt-8">
                    <div
                        className={`relative ${animatingIndex === doneIndex ? 'animate-fly-down' : ''}`}
                        onAnimationEnd={handleAnimationEnd}
                    >
                        <img
                            src={currentCard.image_url}
                            alt={currentCard.name}
                            className="rounded-xl"
                            style={{
                                height: '364px',
                                width: 'auto',
                                boxShadow:
                                    RARITY_GLOW[currentCard.rarity] ===
                                    'rainbow'
                                        ? undefined
                                        : `0 0 20px 4px rgba(${RARITY_GLOW[currentCard.rarity] ?? '156,163,175'}, 0.6)`,
                            }}
                        />
                    </div>

                    {/* Card metadata */}
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-gray-600">
                                #{currentCard.national_pokedex_number}
                            </span>
                            <p className="text-white font-semibold text-lg tracking-wide">
                                {currentCard.name}
                            </p>
                            {currentCard.isNew && (
                                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full">
                                    NEW
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-center">
                            <p className="text-xs text-gray-400">
                                raw value:{' '}
                                <span className="text-green-600">
                                    ${currentCard.worth?.toFixed(2)}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() =>
                                setDoneIndex(
                                    (prev) =>
                                        (prev - 1 + remainingCards.length) %
                                        remainingCards.length,
                                )
                            }
                            className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                        >
                            ←
                        </button>
                        <span className="text-gray-400 text-sm">
                            {doneIndex + 1} / {remainingCards.length}
                        </span>
                        <button
                            onClick={() =>
                                setDoneIndex(
                                    (prev) =>
                                        (prev + 1) % remainingCards.length,
                                )
                            }
                            className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                        >
                            →
                        </button>
                    </div>

                    <button
                        onClick={handleAddToBag}
                        className="border border-gray-600 text-gray-300 px-6 py-2 rounded-lg text-sm hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                    >
                        Add to Bag
                    </button>
                </div>
            )}
        </div>
    )
}
