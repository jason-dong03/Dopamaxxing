'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isRainbow, rarityGlowRgb, rarityTextStyle } from '@/lib/rarityConfig'
import { ShatterEffect } from './ShatterEffect'
import type { Pack } from '@/lib/packs'

// ─── reel constants ────────────────────────────────────────────────────────────
const CARD_W = 120
const CARD_H = 168
const GAP = 6
const PITCH = CARD_W + GAP   // 126px per slot
const STRIP_SIZE = 62
const WINNER_IDX = 52        // where the guaranteed winner sits in the strip

// ─── types ────────────────────────────────────────────────────────────────────
type PoolCard = { id: string; image_url: string; name: string; rarity: string }

type WonCard = PoolCard & {
    national_pokedex_number: number
    worth: number
    isNew: boolean
    coins: number
    isHot: boolean
}

type Phase = 'idle' | 'loading' | 'spinning' | 'done'

// ─── component ────────────────────────────────────────────────────────────────
export default function CrateOpening({
    pack,
    onBack,
}: {
    pack: Pack
    onBack: () => void
}) {
    const router = useRouter()
    const [phase, setPhase] = useState<Phase>('idle')
    const [strip, setStrip] = useState<PoolCard[]>([])
    const [wonCard, setWonCard] = useState<WonCard | null>(null)
    const [poolSize, setPoolSize] = useState(0)
    const [targetX, setTargetX] = useState(0)
    const [spinning, setSpinning] = useState(false)
    const [rested, setRested] = useState(false)
    const [shattering, setShattering] = useState(false)
    const [flyingDown, setFlyingDown] = useState(false)
    const [actionDone, setActionDone] = useState(false)
    const [soldCoins, setSoldCoins] = useState<number | null>(null)
    const [coinError, setCoinError] = useState<{ cost: number; coins: number } | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const startedRef = useRef(false)

    async function handleOpen() {
        if (phase !== 'idle') return
        setCoinError(null)
        setPhase('loading')

        const res = await fetch('/api/open-pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setId: pack.id }),
        })

        if (res.status === 402) {
            const data = await res.json()
            setPhase('idle')
            setCoinError({ cost: data.cost, coins: data.coins })
            return
        }

        const data = await res.json()

        // refresh server data so coin count in header updates immediately
        router.refresh()

        const winner: WonCard = data.cards[0]
        const pool: PoolCard[] = data.cardPool ?? [winner]

        setPoolSize(pool.length)
        setWonCard(winner)

        // build strip: random pool cards with winner guaranteed at WINNER_IDX
        const s: PoolCard[] = Array.from({ length: STRIP_SIZE }, (_, i) =>
            i === WINNER_IDX ? winner : pool[Math.floor(Math.random() * pool.length)],
        )
        setStrip(s)
        startedRef.current = false
        setPhase('spinning')
    }

    // kick off CSS transition after the strip has rendered
    useEffect(() => {
        if (phase !== 'spinning' || startedRef.current) return
        startedRef.current = true
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                const cw = containerRef.current?.clientWidth ?? 640
                const winnerCenter = WINNER_IDX * PITCH + CARD_W / 2
                setTargetX(-(winnerCenter - cw / 2))
                setSpinning(true)
            }),
        )
    }, [phase])

    function handleTransitionEnd() {
        if (!spinning) return
        setSpinning(false)
        setRested(true)
        setTimeout(() => setPhase('done'), 1600)
    }

    async function handleAddToBag() {
        if (!wonCard || actionDone) return
        setActionDone(true)
        await fetch('/api/add-to-bag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: wonCard.id, worth: wonCard.coins, isHot: wonCard.isHot }),
        })
        onBack()
    }

    async function handleSell() {
        if (!wonCard || actionDone) return
        setActionDone(true)
        setShattering(true)
        const coins = wonCard.coins
        await fetch('/api/buyback-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_buyback_amount: coins }),
        })
        setTimeout(() => {
            setShattering(false)
            setSoldCoins(coins)
        }, 900)
    }

    async function handleFeed() {
        if (!wonCard || actionDone) return
        setActionDone(true)
        setFlyingDown(true)
        await fetch('/api/feed-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardID: wonCard.id }),
        })
    }

    const wonRarity = wonCard?.rarity ?? 'Common'
    const glowRgb = rarityGlowRgb(wonRarity)
    const wonIsRainbow = isRainbow(wonRarity)

    // ── idle / loading ────────────────────────────────────────────────────────
    if (phase === 'idle' || phase === 'loading') {
        return (
            <div className="flex flex-col items-center mt-12 gap-7">
                {coinError && (
                    <div
                        className="flex items-center gap-2 px-4 py-3 rounded-xl"
                        style={{
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.2)',
                        }}
                    >
                        <p className="text-red-400 text-xs">
                            not enough coins — need{' '}
                            <span className="font-bold">🪙 {coinError.cost}</span>
                            , you have{' '}
                            <span className="font-bold text-gray-400">
                                {coinError.coins}
                            </span>
                        </p>
                    </div>
                )}
                <div
                    className={
                        phase === 'loading'
                            ? 'animate-pulse'
                            : 'cursor-pointer hover:scale-105 transition-transform duration-300'
                    }
                    style={{ filter: 'drop-shadow(0 0 24px rgba(234,179,8,0.5))' }}
                    onClick={phase === 'idle' ? handleOpen : undefined}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                            height: 200,
                            width: 'auto',
                            objectFit: 'contain',
                            opacity: phase === 'loading' ? 0.55 : 1,
                            transition: 'opacity 0.3s',
                        }}
                    />
                </div>

                {phase === 'idle' ? (
                    <button
                        onClick={handleOpen}
                        className="px-8 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 hover:scale-105"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(255,255,255,0.06))',
                            border: '1px solid rgba(234,179,8,0.35)',
                            color: '#eab308',
                            letterSpacing: '0.08em',
                        }}
                    >
                        Open Box
                    </button>
                ) : (
                    <p className="text-gray-600 text-xs tracking-widest uppercase animate-pulse">
                        opening…
                    </p>
                )}

                <button
                    onClick={onBack}
                    className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
                >
                    ← back
                </button>
            </div>
        )
    }

    // ── spinning ──────────────────────────────────────────────────────────────
    if (phase === 'spinning') {
        return (
            <div className="flex flex-col items-center mt-10 gap-6 w-full px-4">
                <p
                    className="uppercase tracking-widest"
                    style={{ fontSize: '0.6rem', color: '#374151' }}
                >
                    {pack.name}
                </p>

                {/* reel container */}
                <div
                    ref={containerRef}
                    className="relative overflow-hidden w-full"
                    style={{
                        maxWidth: 760,
                        height: CARD_H + 32,
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 16,
                    }}
                >
                    {/* left/right fades */}
                    <div
                        className="absolute inset-y-0 left-0 z-10 pointer-events-none"
                        style={{
                            width: 100,
                            background: 'linear-gradient(to right, #08080d 30%, transparent)',
                        }}
                    />
                    <div
                        className="absolute inset-y-0 right-0 z-10 pointer-events-none"
                        style={{
                            width: 100,
                            background: 'linear-gradient(to left, #08080d 30%, transparent)',
                        }}
                    />

                    {/* center marker line */}
                    <div
                        className="absolute inset-y-0 left-1/2 -translate-x-px z-20 pointer-events-none"
                        style={{
                            width: 2,
                            background: rested
                                ? `rgba(${glowRgb}, 0.9)`
                                : 'rgba(234,179,8,0.8)',
                            boxShadow: rested
                                ? `0 0 12px rgba(${glowRgb}, 1), 0 0 24px rgba(${glowRgb}, 0.5)`
                                : '0 0 10px rgba(234,179,8,1)',
                            transition: 'background 0.5s, box-shadow 0.5s',
                        }}
                    />

                    {/* card strip */}
                    <div
                        className="absolute flex items-center"
                        style={{
                            top: 16,
                            left: 0,
                            gap: GAP,
                            transform: `translateX(${targetX}px)`,
                            transition: spinning
                                ? 'transform 7s cubic-bezier(0.04, 0, 0.12, 1)'
                                : 'none',
                            willChange: 'transform',
                        }}
                        onTransitionEnd={handleTransitionEnd}
                    >
                        {strip.map((card, i) => {
                            const isWinner = rested && i === WINNER_IDX
                            const cardIsRainbow = isRainbow(card.rarity)
                            const cGlow = rarityGlowRgb(card.rarity)
                            return (
                                <div
                                    key={i}
                                    className={isWinner && cardIsRainbow ? 'glow-rainbow' : undefined}
                                    style={{
                                        width: CARD_W,
                                        height: CARD_H,
                                        flexShrink: 0,
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        border: isWinner
                                            ? `2px solid rgba(${cGlow}, 1)`
                                            : '1px solid rgba(255,255,255,0.07)',
                                        boxShadow:
                                            isWinner && !cardIsRainbow
                                                ? `0 0 20px rgba(${cGlow}, 0.8), 0 0 44px rgba(${cGlow}, 0.35)`
                                                : !isWinner
                                                  ? `0 0 8px rgba(${cGlow}, 0.18)`
                                                  : undefined,
                                        transform: isWinner ? 'scale(1.07)' : 'scale(1)',
                                        transition:
                                            'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s, border 0.4s',
                                    }}
                                >
                                    <img
                                        src={card.image_url}
                                        alt={card.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* winner name fade-in after reel rests */}
                {rested && wonCard && (
                    <div className="flex flex-col items-center gap-1 animate-slide-up">
                        <p
                            className="font-bold text-base"
                            style={rarityTextStyle(wonCard.rarity)}
                        >
                            {wonCard.name}
                        </p>
                        <p
                            className="uppercase tracking-widest"
                            style={{ fontSize: '0.58rem', color: '#4b5563' }}
                        >
                            {wonCard.rarity} · 1 / {poolSize} (
                            {((1 / poolSize) * 100).toFixed(2)}%)
                        </p>
                    </div>
                )}
            </div>
        )
    }

    // ── done ──────────────────────────────────────────────────────────────────
    if (phase === 'done' && wonCard) {
        const odds = `1 / ${poolSize} (${((1 / poolSize) * 100).toFixed(2)}%)`

        // sold state — shatter played, show confirmation
        if (soldCoins !== null) {
            return (
                <div className="flex flex-col items-center mt-16 gap-4">
                    <p className="text-gray-400 text-sm">sold for</p>
                    <p className="text-yellow-300 font-bold text-2xl">🪙 {soldCoins} coins</p>
                    <button
                        onClick={onBack}
                        className="mt-4 text-gray-400 text-sm hover:text-white transition-colors"
                    >
                        ← open another
                    </button>
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center mt-8 gap-5">
                {/* card — wrapper handles slide-up so img opacity stays controllable */}
                <div
                    className={`relative animate-slide-up${flyingDown ? ' animate-fly-down' : ''}`}
                    onAnimationEnd={(e) => {
                        if (flyingDown && e.animationName === 'flyDown') onBack()
                    }}
                >
                    <img
                        src={wonCard.image_url}
                        alt={wonCard.name}
                        className={`rounded-xl${wonIsRainbow ? ' glow-rainbow' : ''}`}
                        style={{
                            height: 340,
                            width: 'auto',
                            opacity: shattering ? 0 : 1,
                            boxShadow: wonIsRainbow
                                ? undefined
                                : `0 0 24px 6px rgba(${glowRgb}, 0.55)`,
                        }}
                    />
                    {shattering && (
                        <ShatterEffect
                            rarity={wonCard.rarity}
                            imageUrl={wonCard.image_url}
                        />
                    )}
                </div>

                {/* metadata */}
                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs font-mono">
                            #{wonCard.national_pokedex_number}
                        </span>
                        <p className="text-white font-bold text-xl">{wonCard.name}</p>
                        {wonCard.isNew && (
                            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full">
                                NEW
                            </span>
                        )}
                    </div>

                    <span
                        className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{
                            fontSize: '0.65rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <span style={rarityTextStyle(wonCard.rarity)}>{wonCard.rarity}</span>
                    </span>

                    <p className="text-gray-500 text-xs tracking-wider">{odds}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                            worth{' '}
                            <span className="text-green-600">
                                ${wonCard.worth?.toFixed(2)}
                            </span>
                        </span>
                        <span>
                            buyback{' '}
                            <span
                                style={{
                                    color: wonCard.isHot
                                        ? 'rgb(234,179,8)'
                                        : 'rgb(134,239,172)',
                                    fontWeight: wonCard.isHot ? 700 : 400,
                                }}
                            >
                                {wonCard.coins} coins
                            </span>
                            {wonCard.isHot && <span className="ml-1">🔥</span>}
                        </span>
                    </div>
                </div>

                {/* actions */}
                {!actionDone && (
                    <div className="flex items-center gap-3 mt-2">
                        {wonCard.isNew ? (
                            <button
                                onClick={handleAddToBag}
                                className="border border-gray-600 text-gray-300 px-6 py-2 rounded-lg text-sm hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                            >
                                Add to Bag
                            </button>
                        ) : (
                            <button
                                onClick={handleFeed}
                                className="border border-purple-800 text-purple-400 px-6 py-2 rounded-lg text-sm hover:border-purple-600 hover:text-purple-200 hover:bg-purple-500/5 active:scale-95 transition-all"
                            >
                                Feed
                            </button>
                        )}
                        <button
                            onClick={handleSell}
                            className="border border-gray-600 text-gray-300 px-6 py-2 rounded-lg text-sm hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                        >
                            Sell 🪙
                        </button>
                    </div>
                )}

                <button
                    onClick={onBack}
                    className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
                >
                    ← back
                </button>
            </div>
        )
    }

    return null
}
