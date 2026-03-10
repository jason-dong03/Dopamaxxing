'use client'
import { useEffect, useRef, useState } from 'react'
import FlipCard from './FlipCard'
import { RARITY_GLOW, rarityToOdds } from '@/lib/rarityConfig'
import { useRouter } from 'next/navigation'
import AutoCompleteSettings from './AutoCompleteSettings'
import {
    loadPrefs,
    getActionForCard,
    type AutoCompletePrefs,
} from '@/lib/autoCompletePref'
import {
    saveSession,
    loadSession,
    clearSession,
    PackSession,
} from '@/lib/packSession'
import { Pack } from '@/lib/packs'
import { ShatterEffect } from './ShatterEffect'

type Props = {
    pack: Pack
    onBack: () => void
}

type Card = {
    id: string
    name: string
    image_url: string
    rarity: string
    national_pokedex_number: number
    worth: number
    isNew: boolean
    coins: number
    isHot: boolean
}

export default function PackOpening({ pack, onBack }: Props) {
    const router = useRouter()
    const [shaking, setShaking] = useState(false)
    const [tearing, setTearing] = useState(false)
    const [opening, setOpening] = useState(false)
    const [phase, setPhase] = useState<'idle' | 'revealing' | 'done'>('idle')
    const [cards, setCards] = useState<Card[]>([])

    const [specialActive, setSpecialActive] = useState(false)
    const [specialGlow, setSpecialGlow] = useState('156, 163, 175')
    const [revealedCount, setRevealedCount] = useState(0)
    const [shattering, setShattering] = useState(false)

    const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set())
    const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)
    const [doneIndex, setDoneIndex] = useState(0)

    const [addedCardIds, setAddedCardIds] = useState<Set<string>>(new Set())
    const [showRarity, setShowRarity] = useState(false)
    const [rarityCard, setRarityCard] = useState<Card | null>(null)

    const remainingCards = cards.filter((_, i) => !addedIndices.has(i))
    const remainingCardsRef = useRef<Card[]>([])
    remainingCardsRef.current = remainingCards

    const [prefs, setPrefs] = useState<AutoCompletePrefs>(() => loadPrefs())
    const [showSettings, setShowSettings] = useState(false)
    const [resumeSession, setResumeSession] = useState<PackSession | null>(null)

    const autocompleteQueue = useRef<string[]>([])
    const isAutocompleting = useRef(false)
    const idleDims =
        pack.aspect === 'box'
            ? { height: '320px', width: '420px' }
            : { height: '500px', width: 'auto' }

    useEffect(() => {
        const session = loadSession()
        if (session) setResumeSession(session)
    }, [])

    function handleResume() {
        if (!resumeSession) return
        setCards(resumeSession.cards)
        setAddedIndices(new Set(resumeSession.addedIndices))
        setDoneIndex(resumeSession.doneIndex)
        setAddedCardIds(new Set(resumeSession.addedCardIds))
        setRevealedCount(resumeSession.cards.length)
        setPhase('done')
        setResumeSession(null)
    }

    async function handleClick() {
        if (shaking || opening) return
        setShaking(true)

        const res = await fetch('/api/open-pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setId: pack.id }),
        })
        const data = await res.json()
        setCards(data.cards)
        saveSession({
            cards: data.cards,
            addedIndices: [],
            doneIndex: 0,
            addedCardIds: [],
        })

        setShaking(false)
        setTearing(true)

        setTimeout(() => {
            setTearing(false)
            setOpening(true)
            setTimeout(() => setPhase('revealing'), 600)
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
        await fetch('/api/add-to-bag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardId: card.id,
                worth: card.coins,
                isHot: card.isHot,
            }),
        })
        setAddedCardIds((prev) => new Set(prev).add(card.id))
    }
    function removeCard(index: number) {
        const card = remainingCardsRef.current[index]
        const realIndex = cards.findIndex((c) => c === card)

        setAddedIndices((prev) => {
            const next = new Set(prev)
            next.add(realIndex)
            return next
        })
        router.refresh()

        const newRemaining = remainingCardsRef.current.filter(
            (_, i) => i !== index,
        )

        if (newRemaining.length === 0) {
            clearSession()
            isAutocompleting.current = false
            setPhase('idle')
            setCards([])
            setRevealedCount(0)
            setAddedIndices(new Set())
            setDoneIndex(0)
            setOpening(false)
        } else {
            const newDoneIndex = Math.min(doneIndex, newRemaining.length - 1)
            setDoneIndex(newDoneIndex)
            saveSession({
                cards,
                addedIndices: [...addedIndices, realIndex],
                doneIndex: newDoneIndex,
                addedCardIds: [...addedCardIds],
            })
        }
    }

    async function handleBuyback() {
        const card = remainingCards[doneIndex]
        setShattering(true)
        await fetch('/api/buyback-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_buyback_amount: card.coins }),
        })
        setTimeout(() => {
            setShattering(false)
            removeCard(doneIndex)
        }, 900)
    }

    async function handleFeedCard() {
        const card = remainingCards[doneIndex]
        setAnimatingIndex(doneIndex)
        await fetch('/api/feed-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardID: card.id }),
        })
    }

    async function handleAutocomplete() {
        if (isAutocompleting.current) return
        isAutocompleting.current = true

        const queue = remainingCardsRef.current
            .map((card) => {
                const currentIsNew = card.isNew && !addedCardIds.has(card.id)
                const action = getActionForCard(card, prefs, currentIsNew)
                return { id: card.id, action }
            })
            .filter(({ action }) => action !== 'skip')

        autocompleteQueue.current = queue.map(({ id }) => id)
        processNextAutocomplete()
    }

    async function processNextAutocomplete() {
        if (autocompleteQueue.current.length === 0) {
            isAutocompleting.current = false
            return
        }

        const cardId = autocompleteQueue.current[0]
        const card = remainingCardsRef.current.find((c) => c.id === cardId)

        if (!card) {
            autocompleteQueue.current.shift()
            processNextAutocomplete()
            return
        }

        const i = remainingCardsRef.current.indexOf(card)
        const currentIsNew = card.isNew && !addedCardIds.has(card.id)
        const action = getActionForCard(card, prefs, currentIsNew)

        setDoneIndex(i)

        if (action === 'add') {
            await fetch('/api/add-to-bag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: card.id,
                    worth: card.coins,
                    isHot: card.isHot,
                }),
            })
            setAddedCardIds((prev) => new Set(prev).add(card.id))
        } else if (action === 'sell') {
            await fetch('/api/buyback-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_buyback_amount: card.coins }),
            })
            setShattering(true)
            await new Promise((res) => setTimeout(res, 900))
            setShattering(false)
            autocompleteQueue.current.shift()
            removeCard(i)
            setTimeout(() => processNextAutocomplete(), 50)
            return
        } else if (action === 'feed') {
            await fetch('/api/feed-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardID: card.id }),
            })
        }

        autocompleteQueue.current.shift()
        setAnimatingIndex(i)
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
        router.refresh()

        const newRemaining = remainingCards.filter(
            (_, i) => i !== animatingIndex,
        )

        if (newRemaining.length === 0) {
            clearSession()
            isAutocompleting.current = false
            setPhase('idle')
            setCards([])
            setRevealedCount(0)
            setAddedIndices(new Set())
            setDoneIndex(0)
            setOpening(false)
        } else {
            const newDoneIndex = Math.min(doneIndex, newRemaining.length - 1)
            setDoneIndex(newDoneIndex)
            saveSession({
                cards,
                addedIndices: [...addedIndices, realIndex],
                doneIndex: newDoneIndex,
                addedCardIds: [...addedCardIds],
            })
            if (isAutocompleting.current) {
                setTimeout(() => processNextAutocomplete(), 50)
            }
        }
    }

    const currentCard = remainingCards[doneIndex]
    const currentCardIsNew =
        currentCard?.isNew && !addedCardIds.has(currentCard.id)

    return (
        <div className="flex flex-col items-center justify-center mt-12">
            {/* keyframes */}
            <style>{`
                @keyframes particle-fly {
                    0%   { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
                    100% { transform: translate(var(--tx),var(--ty)) scale(0.2) rotate(var(--rot)); opacity: 0; }
                }
            `}</style>

            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at center, rgba(${specialGlow}, 0.5) 0%, transparent 70%)`,
                    zIndex: 41,
                    opacity: specialActive ? 1 : 0,
                    transition: 'opacity 800ms ease-in-out',
                }}
            />

            {/* pack */}
            {phase === 'idle' && (
                <>
                    {resumeSession && (
                        <div
                            className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <p className="text-gray-400 text-xs flex-1">
                                you have unresolved cards from your last pack
                            </p>
                            <button
                                onClick={handleResume}
                                className="text-white text-xs px-3 py-1.5 rounded-lg"
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                }}
                            >
                                resume
                            </button>
                            <button
                                onClick={() => {
                                    clearSession()
                                    setResumeSession(null)
                                }}
                                className="text-gray-600 text-xs"
                            >
                                dismiss
                            </button>
                        </div>
                    )}
                    <div
                        className={`cursor-pointer animate-subtle-pulse hover:scale-105 ${shaking ? 'animate-shake' : ''} ${opening ? 'animate-fade-out' : ''}`}
                        style={{
                            filter: 'drop-shadow(0 0 20px rgba(228,228,228,0.99))',
                            transform: tearing
                                ? 'scale(1.12) rotate(2deg)'
                                : undefined,
                            transition: tearing
                                ? 'transform 300ms ease-in-out'
                                : undefined,
                        }}
                    >
                        <img
                            src={pack.image}
                            alt={pack.name}
                            onClick={handleClick}
                            className="cursor-pointer"
                            style={{ ...idleDims, objectFit: 'contain' }}
                        />
                    </div>
                    <div className="flex items-center justify-center mt-8">
                        <button
                            onClick={onBack}
                            className="text-gray-600 text-xs mt-4 hover:text-gray-400"
                        >
                            ← back
                        </button>
                    </div>
                </>
            )}

            {/* card stack */}
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
                                    onFlipped={
                                        isTop
                                            ? () => {
                                                  setShowRarity(true)
                                                  setRarityCard(card)
                                              }
                                            : () => {}
                                    }
                                    onConfirmed={
                                        isTop
                                            ? () => setShowRarity(false)
                                            : () => {}
                                    }
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

            {/* rarity odds after flip */}
            {phase === 'revealing' && showRarity && rarityCard && (
                <div className="mt-6 text-center">
                    <p
                        className="text-xs tracking-widest uppercase"
                        style={{
                            color: `rgba(${RARITY_GLOW[rarityCard.rarity]}, 1)`,
                        }}
                    >
                        {rarityCard.rarity} · {rarityToOdds(rarityCard.rarity)}
                    </p>
                </div>
            )}

            {/* done phase */}
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
                                opacity: shattering ? 0 : 1,
                                boxShadow:
                                    RARITY_GLOW[currentCard.rarity] ===
                                    'rainbow'
                                        ? undefined
                                        : `0 0 20px 4px rgba(${RARITY_GLOW[currentCard.rarity] ?? '156,163,175'}, 0.6)`,
                            }}
                        />
                        {shattering && (
                            <ShatterEffect
                                rarity={currentCard.rarity}
                                imageUrl={currentCard.image_url}
                            />
                        )}
                    </div>

                    {/* card metadata */}
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-end justify-center gap-2">
                            <span className="text-xs text-gray-600">
                                #{currentCard.national_pokedex_number}
                            </span>
                            <p className="text-white font-semibold text-lg tracking-wide">
                                {currentCard.name}
                            </p>
                            {currentCardIsNew && (
                                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full">
                                    NEW
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <p className="text-xs text-gray-400">
                                raw value:{' '}
                                <span className="text-green-600">
                                    ${currentCard.worth?.toFixed(2)}
                                </span>
                            </p>
                            <p className="text-xs text-gray-400">
                                buyback value:{' '}
                                <span
                                    className={
                                        currentCard.isHot
                                            ? 'animate-subtle-pulse'
                                            : ''
                                    }
                                    style={{
                                        color: currentCard.isHot
                                            ? 'rgb(234,179,8)'
                                            : 'rgb(134,239,172)',
                                        textShadow: currentCard.isHot
                                            ? '0 0 8px rgba(234,179,8,0.8), 0 0 16px rgba(234,179,8,0.4)'
                                            : 'none',
                                        fontWeight: currentCard.isHot
                                            ? 'bold'
                                            : 'normal',
                                    }}
                                >
                                    {currentCard.coins} coins
                                </span>
                                {currentCard.isHot && (
                                    <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-2 py-0.5 rounded-full animate-subtle-pulse">
                                        🔥 HOT
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* navigation */}
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

                    {/* action buttons */}
                    <div className="flex items-center gap-2">
                        {currentCardIsNew ? (
                            <button
                                disabled={animatingIndex !== null || shattering}
                                onClick={handleAddToBag}
                                className="border border-gray-600 text-gray-300 px-6 py-2 rounded-lg text-sm hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Add to Bag
                            </button>
                        ) : (
                            <button
                                disabled={animatingIndex !== null || shattering}
                                onClick={handleFeedCard}
                                className="border border-purple-800 text-purple-400 px-6 py-2 rounded-lg text-sm hover:border-purple-600 hover:text-purple-200 hover:bg-purple-500/5 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Feed
                            </button>
                        )}
                        <button
                            disabled={animatingIndex !== null || shattering}
                            onClick={handleBuyback}
                            className="border border-gray-600 text-gray-300 px-6 py-2 rounded-lg text-sm hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Sell 🪙
                        </button>
                    </div>

                    {/* autocomplete row */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAutocomplete}
                            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                    'rgba(255,255,255,0.12)'
                                e.currentTarget.style.transform =
                                    'translateY(-2px)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                    'rgba(255,255,255,0.06)'
                                e.currentTarget.style.transform =
                                    'translateY(0)'
                            }}
                        >
                            ⚡ autocomplete
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 transition-all"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#4b5563',
                                fontSize: '1rem',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#9ca3af'
                                e.currentTarget.style.transform =
                                    'translateY(-2px)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#4b5563'
                                e.currentTarget.style.transform =
                                    'translateY(0)'
                            }}
                        >
                            ⚙
                        </button>
                    </div>
                </div>
            )}

            {showSettings && (
                <AutoCompleteSettings
                    prefs={prefs}
                    onSave={setPrefs}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    )
}
