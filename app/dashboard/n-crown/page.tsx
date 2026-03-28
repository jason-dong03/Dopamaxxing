'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── types ────────────────────────────────────────────────────────────────────
interface UserCard {
    id: string
    card_id: string
    card_level: number
    cards: {
        id: string
        name: string
        image_url: string
        rarity: string
    }
}

// ─── dialogue lines ────────────────────────────────────────────────────────────
const DIALOGUE: string[] = [
    '...',
    "These Pokémon... they were never mine to keep.",
    "They chose to stay with me.\nI never deserved that.",
    "Reshiram... Zekrom...\nThe friends I released to the sky...",
    "I told myself it was freedom.\nBut I was afraid.",
    "Afraid that if they stayed,\nthey'd see how broken I was.",
    "They already knew.\nThey stayed anyway.",
    "If you have found this...\nyou understand what I couldn't say.",
    "Thank you for carrying them.\nThey are free now. And so am I.",
]

// ─── main component ────────────────────────────────────────────────────────────
export default function NCrownPage() {
    // collection of user's N's cards
    const [nCards, setNCards] = useState<UserCard[]>([])
    const [loadingCards, setLoadingCards] = useState(true)

    // 3 slots
    const [slots, setSlots] = useState<(UserCard | null)[]>([null, null, null])

    // picker modal
    const [pickerSlot, setPickerSlot] = useState<number | null>(null)
    const [pickerSearch, setPickerSearch] = useState('')

    // cutscene
    const [phase, setPhase] = useState<'idle' | 'cutscene' | 'fadeout' | 'farewell'>('idle')
    const [dialogueIndex, setDialogueIndex] = useState(0)
    const [displayedText, setDisplayedText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [fadeOpacity, setFadeOpacity] = useState(0)
    const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const farewellCalledRef = useRef(false)

    // fetch user's cards on mount
    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('user_cards')
                .select('id, card_id, card_level, cards!inner(id, name, image_url, rarity)')
                .eq('user_id', user.id)
                .then(({ data }) => {
                    if (!data) return
                    const cards = (data as unknown as UserCard[]).filter(uc =>
                        uc.cards.name.startsWith("N's ")
                    )
                    setNCards(cards)
                    setLoadingCards(false)
                })
        })
    }, [])

    // typewriter effect
    useEffect(() => {
        if (phase !== 'cutscene') return
        const fullText = DIALOGUE[dialogueIndex] ?? ''
        setDisplayedText('')
        setIsTyping(true)
        let i = 0

        function typeNext() {
            i++
            setDisplayedText(fullText.slice(0, i))
            if (i < fullText.length) {
                typingRef.current = setTimeout(typeNext, 30)
            } else {
                setIsTyping(false)
            }
        }

        typingRef.current = setTimeout(typeNext, 30)
        return () => {
            if (typingRef.current) clearTimeout(typingRef.current)
        }
    }, [dialogueIndex, phase])

    function advanceDialogue() {
        if (isTyping) {
            // skip to end of current line
            if (typingRef.current) clearTimeout(typingRef.current)
            setDisplayedText(DIALOGUE[dialogueIndex] ?? '')
            setIsTyping(false)
            return
        }

        const nextIndex = dialogueIndex + 1
        if (nextIndex < DIALOGUE.length) {
            setDialogueIndex(nextIndex)
        } else {
            // last line advanced — fade to black
            setPhase('fadeout')
            setFadeOpacity(0)
            let start: number | null = null
            const duration = 1500
            function animateFade(ts: number) {
                if (start === null) start = ts
                const elapsed = ts - start
                const progress = Math.min(elapsed / duration, 1)
                setFadeOpacity(progress)
                if (progress < 1) {
                    requestAnimationFrame(animateFade)
                } else {
                    // call farewell API
                    if (!farewellCalledRef.current) {
                        farewellCalledRef.current = true
                        fetch('/api/n-farewell', { method: 'POST' }).catch(() => {})
                    }
                    setPhase('farewell')
                }
            }
            requestAnimationFrame(animateFade)
        }
    }

    const allSlotsFilled = slots.every(s => s !== null)

    // placed card ids (to avoid double-placing)
    const placedIds = new Set(slots.filter(Boolean).map(s => s!.id))

    // picker filtered cards
    const pickerCards = nCards.filter(uc => {
        if (pickerSearch && !uc.cards.name.toLowerCase().includes(pickerSearch.toLowerCase())) return false
        if (placedIds.has(uc.id) && slots[pickerSlot!]?.id !== uc.id) return false
        return true
    })

    function placeCard(card: UserCard) {
        if (pickerSlot === null) return
        setSlots(prev => {
            const next = [...prev]
            next[pickerSlot] = card
            return next
        })
        setPickerSlot(null)
        setPickerSearch('')
    }

    // ─── render ────────────────────────────────────────────────────────────────

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080c10',
            color: '#e2e8f0',
            fontFamily: 'sans-serif',
        }}>
            {/* back button */}
            <div style={{ padding: '16px 20px' }}>
                <a
                    href="/dashboard/bag"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        textDecoration: 'none',
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.03)',
                    }}
                >
                    ← Back to Bag
                </a>
            </div>

            {/* title */}
            <div style={{ textAlign: 'center', padding: '24px 20px 8px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👑</div>
                <h1 style={{
                    margin: 0,
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: '#facc15',
                    letterSpacing: '0.05em',
                }}>
                    N&apos;s Crown
                </h1>
                <p style={{
                    margin: '10px auto 0',
                    maxWidth: 420,
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    lineHeight: 1.7,
                }}>
                    Three of N&apos;s Pokémon... they wait in the memory of this crown.
                </p>
            </div>

            {/* card slots */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
                padding: '32px 20px',
                flexWrap: 'wrap',
            }}>
                {slots.map((card, i) => (
                    <div
                        key={i}
                        onClick={() => {
                            setPickerSlot(i)
                            setPickerSearch('')
                        }}
                        style={{
                            width: 130,
                            height: 180,
                            borderRadius: 12,
                            border: card
                                ? '1px solid rgba(250,204,21,0.35)'
                                : '1.5px dashed rgba(250,204,21,0.2)',
                            background: card
                                ? 'rgba(250,204,21,0.05)'
                                : 'rgba(255,255,255,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                            overflow: 'hidden',
                            position: 'relative',
                        }}
                    >
                        {card ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={card.cards.image_url}
                                    alt={card.cards.name}
                                    style={{
                                        width: '100%',
                                        height: '140px',
                                        objectFit: 'cover',
                                        imageRendering: 'pixelated',
                                    }}
                                />
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: '#facc15',
                                    textAlign: 'center',
                                    padding: '4px 6px',
                                    lineHeight: 1.3,
                                }}>
                                    {card.cards.name}
                                </p>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 12 }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: 6, opacity: 0.3 }}>👑</div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.62rem',
                                    color: '#4b5563',
                                    lineHeight: 1.4,
                                }}>
                                    Place N&apos;s<br />Pokémon
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* reveal button */}
            {allSlotsFilled && phase === 'idle' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 48px' }}>
                    <button
                        onClick={() => {
                            setPhase('cutscene')
                            setDialogueIndex(0)
                            setDisplayedText('')
                        }}
                        style={{
                            padding: '14px 36px',
                            borderRadius: 12,
                            border: '1px solid rgba(250,204,21,0.5)',
                            background: 'rgba(250,204,21,0.1)',
                            color: '#facc15',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 0 24px rgba(250,204,21,0.2)',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Reveal N&apos;s Memory →
                    </button>
                </div>
            )}

            {/* ─── picker modal ─────────────────────────────────────────────── */}
            {pickerSlot !== null && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100,
                        background: 'rgba(0,0,0,0.92)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '24px 20px',
                    }}
                    onClick={() => setPickerSlot(null)}
                >
                    <div
                        style={{
                            maxWidth: 480,
                            width: '100%',
                            margin: '0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            minHeight: 0,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#facc15' }}>
                                Choose N&apos;s Pokémon
                            </h2>
                            <button
                                onClick={() => setPickerSlot(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6b7280',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: 4,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="search..."
                            value={pickerSearch}
                            onChange={e => setPickerSearch(e.target.value)}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#e2e8f0',
                                fontSize: '0.8rem',
                                outline: 'none',
                                marginBottom: 16,
                                boxSizing: 'border-box',
                            }}
                        />

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {loadingCards ? (
                                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', padding: '32px 0' }}>
                                    Loading...
                                </p>
                            ) : pickerCards.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', padding: '32px 0' }}>
                                    {nCards.length === 0
                                        ? "You don't have any of N's Pokémon yet."
                                        : 'No cards match your search.'}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {pickerCards.map(uc => {
                                        const alreadyPlaced = placedIds.has(uc.id) && slots[pickerSlot]?.id !== uc.id
                                        return (
                                            <div
                                                key={uc.id}
                                                onClick={() => !alreadyPlaced && placeCard(uc)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '10px 14px',
                                                    borderRadius: 10,
                                                    border: '1px solid rgba(255,255,255,0.07)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    cursor: alreadyPlaced ? 'not-allowed' : 'pointer',
                                                    opacity: alreadyPlaced ? 0.4 : 1,
                                                    transition: 'all 150ms ease',
                                                }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={uc.cards.image_url}
                                                    alt={uc.cards.name}
                                                    style={{
                                                        width: 40,
                                                        height: 56,
                                                        objectFit: 'cover',
                                                        borderRadius: 4,
                                                        imageRendering: 'pixelated',
                                                    }}
                                                />
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
                                                        {uc.cards.name}
                                                    </p>
                                                    <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#6b7280' }}>
                                                        Lv. {uc.card_level} · {uc.cards.rarity}
                                                    </p>
                                                </div>
                                                {alreadyPlaced && (
                                                    <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: '#4b5563' }}>
                                                        In use
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── cutscene overlay ──────────────────────────────────────────── */}
            {(phase === 'cutscene' || phase === 'fadeout') && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 200,
                        background: '#000',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                    onClick={phase === 'cutscene' ? advanceDialogue : undefined}
                >
                    {/* fade overlay for fadeout phase */}
                    {phase === 'fadeout' && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: '#000',
                            opacity: fadeOpacity,
                            zIndex: 10,
                            pointerEvents: 'none',
                        }} />
                    )}

                    {/* N sprite */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/trainers/N-masters.gif"
                        alt="N"
                        style={{
                            height: 110,
                            imageRendering: 'pixelated',
                            marginBottom: 32,
                        }}
                    />

                    {/* dialogue box */}
                    <div style={{
                        maxWidth: 480,
                        width: 'calc(100% - 40px)',
                        background: 'rgba(10,10,16,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        padding: '20px 24px',
                        position: 'relative',
                    }}>
                        <p style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            lineHeight: 1.8,
                            color: '#e2e8f0',
                            fontFamily: "'PokemonClassic', monospace",
                            whiteSpace: 'pre-line',
                            minHeight: '3.6rem',
                        }}>
                            {displayedText}
                            {isTyping && <span style={{ opacity: 0.7 }}>|</span>}
                        </p>
                        {!isTyping && (
                            <div style={{
                                position: 'absolute',
                                bottom: 12,
                                right: 16,
                                fontSize: '0.65rem',
                                color: '#4b5563',
                                animation: 'pulse 1.2s ease-in-out infinite',
                            }}>
                                tap to continue ▼
                            </div>
                        )}
                    </div>

                    {/* progress indicator */}
                    <div style={{
                        marginTop: 16,
                        display: 'flex',
                        gap: 4,
                    }}>
                        {DIALOGUE.map((_, i) => (
                            <div key={i} style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: i <= dialogueIndex ? 'rgba(250,204,21,0.6)' : 'rgba(255,255,255,0.1)',
                                transition: 'background 300ms ease',
                            }} />
                        ))}
                    </div>
                </div>
            )}

            {/* ─── farewell popup ────────────────────────────────────────────── */}
            {phase === 'farewell' && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 300,
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 24px',
                }}>
                    <div style={{
                        maxWidth: 420,
                        width: '100%',
                        background: 'rgba(10,10,16,0.99)',
                        border: '1px solid rgba(250,204,21,0.25)',
                        borderRadius: 20,
                        padding: '36px 28px',
                        textAlign: 'center',
                        boxShadow: '0 0 60px rgba(250,204,21,0.1)',
                    }}>
                        <div style={{
                            fontSize: '2.8rem',
                            marginBottom: 16,
                            filter: 'drop-shadow(0 0 12px rgba(250,204,21,0.5))',
                        }}>
                            👑
                        </div>
                        <h2 style={{
                            margin: '0 0 16px',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: '#facc15',
                            letterSpacing: '0.05em',
                        }}>
                            N&apos;s Farewell
                        </h2>
                        <p style={{
                            margin: '0 0 20px',
                            fontSize: '0.8rem',
                            color: '#9ca3af',
                            lineHeight: 1.8,
                        }}>
                            The memories stored in this crown have been released. N&apos;s Pokémon
                            have found a trainer worthy of their trust. May they battle with the
                            freedom they always deserved.
                        </p>
                        <p style={{
                            margin: '0 0 28px',
                            fontSize: '0.68rem',
                            color: '#4b5563',
                            fontStyle: 'italic',
                        }}>
                            — N, Pokémon Trainer
                        </p>
                        <button
                            onClick={() => setPhase('idle')}
                            style={{
                                padding: '10px 28px',
                                borderRadius: 10,
                                border: '1px solid rgba(250,204,21,0.3)',
                                background: 'rgba(250,204,21,0.08)',
                                color: '#facc15',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
