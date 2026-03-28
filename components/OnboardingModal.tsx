'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { PACKS } from '@/lib/packs'

const STORAGE_KEY = 'dopamaxxing_onboarded_v1'
const PAD = 10
const Z = { backdrop: 10020, panels: 10021, ring: 10023, intercept: 10024, tooltip: 10025, modal: 10021 }

// ─── Cutscene dialogue ────────────────────────────────────────────────────────
const CUTSCENE_LINES = [
    'Every card tells a story.',
    'Some Pokémon have waited years\nto find a trainer worth battling.',
    "In this world, your collection\nis your strength.",
    "N has been watching.\nHe wants to see what you're made of.",
    'Are you ready to begin?',
]

// ─── Starter pack choices ─────────────────────────────────────────────────────
const STARTER_PACK_IDS = ['sv10.5b', 'sv10.5w', 'sv08.5', 'sv03.5', 'me02.5']
const STARTER_PACKS = PACKS.filter(p => STARTER_PACK_IDS.includes(p.id))

// ─── Tutorial steps ───────────────────────────────────────────────────────────
type StepDef = {
    title: string
    body: string
    target?: string
    prompt?: string
    tooltipAnchor?: 'inside-top'
}

const STEPS: StepDef[] = [
    {
        title: 'Your Coin Balance',
        body: "You've started with $100 coins and earn 1 coin per minute. Your balance is always shown at the top.",
        target: '[data-tutorial="coins"]',
        prompt: 'Click your coin balance to continue',
    },
    {
        title: 'Opening Packs',
        body: 'Click any pack to open it. Each pack has 5 cards — the last slot is guaranteed Uncommon or better.',
        target: '[data-tutorial="packs"]',
        prompt: 'Click the pack grid to continue',
        tooltipAnchor: 'inside-top',
    },
    {
        title: 'Your Bag',
        body: 'Every card you collect goes into your Bag. Feed duplicates into cards you own to level them up.',
        target: 'a[href="/dashboard/bag"]',
        prompt: 'Click the Bag icon to continue',
    },
    {
        title: 'Battles',
        body: 'Challenge daily trainers to earn EXP for your cards. Win to level up your team.',
        target: 'a[href="/dashboard/battles"]',
        prompt: 'Click Battles to continue',
    },
    {
        title: 'Daily Quests',
        body: 'Complete quests to earn extra coins and XP. Many quests track automatic actions like opening packs.',
        target: 'a[href="/dashboard/quests"]',
        prompt: 'Click Quests to continue',
    },
    {
        title: "You're all set",
        body: 'Open packs, collect cards, battle trainers, and complete quests. Link Discord for free drops and community rewards.',
    },
]

type Hole = { top: number; left: number; right: number; bottom: number; width: number; height: number }
type Phase = 'cutscene' | 'starter-pack' | 'tutorial'

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingModal() {
    const [visible, setVisible]     = useState(false)
    const [phase, setPhase]         = useState<Phase>('cutscene')
    const [step, setStep]           = useState(0)
    const [mounted, setMounted]     = useState(false)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const router = useRouter()

    // Cutscene state
    const [lineIdx, setLineIdx]     = useState(0)
    const [displayed, setDisplayed] = useState('')
    const [isTyping, setIsTyping]   = useState(true)
    const typeRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Starter pack state
    const [pickedPack, setPickedPack]   = useState('')
    const [claiming, setClaiming]       = useState(false)
    const [claimError, setClaimError]   = useState('')
    const [claimed, setClaimed]         = useState(false)

    useEffect(() => {
        setMounted(true)
        if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
        function handleReplay() {
            setPhase('cutscene')
            setLineIdx(0)
            setStep(0)
            setVisible(true)
            router.push('/dashboard')
        }
        window.addEventListener('replay-tutorial', handleReplay)
        return () => window.removeEventListener('replay-tutorial', handleReplay)
    }, [router])

    // ── Cutscene typewriter ───────────────────────────────────────────────────
    useEffect(() => {
        if (!visible || phase !== 'cutscene') return
        const line = CUTSCENE_LINES[lineIdx]
        setDisplayed('')
        setIsTyping(true)
        let i = 0
        typeRef.current = setInterval(() => {
            i++
            setDisplayed(line.slice(0, i))
            if (i >= line.length) {
                clearInterval(typeRef.current!)
                typeRef.current = null
                setIsTyping(false)
            }
        }, 28)
        return () => { if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null } }
    }, [lineIdx, visible, phase])

    function advanceCutscene() {
        if (isTyping) {
            clearInterval(typeRef.current!)
            typeRef.current = null
            setDisplayed(CUTSCENE_LINES[lineIdx])
            setIsTyping(false)
            return
        }
        if (lineIdx < CUTSCENE_LINES.length - 1) {
            setLineIdx(l => l + 1)
        } else {
            setPhase('starter-pack')
        }
    }

    // ── Spotlight tracking ────────────────────────────────────────────────────
    const current = STEPS[step]
    useEffect(() => {
        if (!visible || phase !== 'tutorial' || !current?.target) { setTargetRect(null); return }
        function update() {
            const el = document.querySelector(current.target!)
            setTargetRect(el ? el.getBoundingClientRect() : null)
        }
        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        const iv = setInterval(update, 300)
        return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); clearInterval(iv) }
    }, [step, visible, phase, current?.target])

    function dismiss() {
        localStorage.setItem(STORAGE_KEY, '1')
        setVisible(false)
    }

    function tutorialNext() {
        if (step < STEPS.length - 1) {
            setStep(s => s + 1)
        } else {
            fetch('/api/complete-tutorial', { method: 'POST' }).catch(() => {})
            window.dispatchEvent(new Event('tutorial-finished'))
            dismiss()
        }
    }

    function tutorialPrev() { if (step > 0) setStep(s => s - 1) }

    async function claimPack() {
        if (!pickedPack || claiming) return
        setClaiming(true)
        setClaimError('')
        try {
            const res = await fetch('/api/claim-starter-pack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packId: pickedPack }),
            })
            const json = await res.json()
            if (!res.ok) {
                setClaimError(json.error ?? 'Something went wrong')
            } else {
                setClaimed(true)
                setTimeout(() => setPhase('tutorial'), 1400)
            }
        } catch {
            setClaimError('Network error, please try again')
        } finally {
            setClaiming(false)
        }
    }

    if (!mounted || !visible) return null

    // ── CUTSCENE ─────────────────────────────────────────────────────────────
    if (phase === 'cutscene') {
        return createPortal(
            <div
                onClick={advanceCutscene}
                style={{
                    position: 'fixed', inset: 0, zIndex: Z.modal,
                    cursor: 'pointer', userSelect: 'none',
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.88) 65%, rgba(0,0,0,0.98) 100%), url('/assets/pokemon-fight.jpg') center/cover no-repeat`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-end',
                    padding: '0 0 max(40px, env(safe-area-inset-bottom, 40px))',
                }}
            >
                {/* N sprite */}
                <div style={{ position: 'absolute', bottom: 'clamp(160px,26vh,220px)', left: '50%', transform: 'translateX(-50%)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/trainers/N-masters.gif"
                        alt="N"
                        style={{ height: 'clamp(100px,16vh,190px)', imageRendering: 'pixelated', filter: 'drop-shadow(0 0 28px rgba(74,222,128,0.35))' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                </div>

                {/* Dialogue box */}
                <div style={{
                    width: 'calc(100% - 24px)', maxWidth: 600,
                    background: 'linear-gradient(160deg,#0c1810 0%,#080f08 100%)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: 16,
                    padding: 'clamp(14px,3vw,20px) clamp(14px,3vw,18px) 16px',
                    position: 'relative',
                    boxShadow: '0 0 60px rgba(74,222,128,0.1), 0 24px 60px rgba(0,0,0,0.8)',
                }}>
                    <div style={{
                        position: 'absolute', top: -13, left: 18,
                        background: 'linear-gradient(135deg,#16a34a,#15803d)',
                        borderRadius: 6, padding: '3px 14px',
                        fontSize: '0.7rem', fontWeight: 800, color: '#fff',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        boxShadow: '0 2px 12px rgba(22,163,74,0.5)',
                    }}>N</div>

                    <p style={{
                        fontSize: 'clamp(0.84rem,2.5vw,0.95rem)',
                        lineHeight: 1.75, color: '#e2e8f0',
                        margin: '6px 0 14px', minHeight: '3.5rem',
                        whiteSpace: 'pre-line',
                    }}>
                        {displayed}
                        {isTyping && (
                            <span style={{
                                display: 'inline-block', width: 2, height: '0.9em',
                                background: '#4ade80', marginLeft: 2, verticalAlign: 'text-bottom',
                                animation: 'cut-cursor 0.6s step-end infinite',
                            }} />
                        )}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {CUTSCENE_LINES.map((_, i) => (
                                <div key={i} style={{
                                    width: i === lineIdx ? 14 : 5, height: 5, borderRadius: 3,
                                    background: i === lineIdx ? '#4ade80' : i < lineIdx ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.08)',
                                    transition: 'all 200ms ease',
                                }} />
                            ))}
                        </div>
                        <span style={{ fontSize: '0.63rem', color: isTyping ? 'transparent' : 'rgba(74,222,128,0.65)', transition: 'color 200ms', letterSpacing: '0.04em' }}>
                            {lineIdx === CUTSCENE_LINES.length - 1 ? 'click to continue' : 'click to continue'} ›
                        </span>
                    </div>
                </div>

                <button
                    onClick={e => { e.stopPropagation(); dismiss() }}
                    style={{
                        position: 'absolute', top: 20, right: 20,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '5px 12px',
                        fontSize: '0.68rem', color: '#374151', cursor: 'pointer',
                    }}
                >Skip</button>

                <style>{`@keyframes cut-cursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
            </div>,
            document.body,
        )
    }

    // ── STARTER PACK ─────────────────────────────────────────────────────────
    if (phase === 'starter-pack') {
        return createPortal(
            <div style={{
                position: 'fixed', inset: 0, zIndex: Z.modal,
                background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 20px',
            }}>
                <div style={{
                    background: 'linear-gradient(160deg,#0e0e1a 0%,#0a0a12 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 22,
                    width: '100%', maxWidth: 520,
                    padding: '28px 24px 24px',
                    display: 'flex', flexDirection: 'column', gap: 18,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.65rem', color: '#a855f7', letterSpacing: '0.1em', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase' }}>
                            Welcome Gift
                        </p>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f3f4f6', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                            Choose Your Starter Pack
                        </h2>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                            Pick one free pack to begin your collection. Choose wisely.
                        </p>
                    </div>

                    {/* Pack grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                        {STARTER_PACKS.map(pack => (
                            <button
                                key={pack.id}
                                onClick={() => setPickedPack(pack.id)}
                                style={{
                                    background: pickedPack === pack.id ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                                    border: pickedPack === pack.id ? '2px solid rgba(168,85,247,0.7)' : '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 10,
                                    padding: '8px 4px',
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                    transition: 'all 150ms ease',
                                    transform: pickedPack === pack.id ? 'scale(1.04)' : 'scale(1)',
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={pack.image}
                                    alt={pack.name}
                                    style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 6, imageRendering: 'auto' }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <span style={{ fontSize: '0.56rem', color: pickedPack === pack.id ? '#c084fc' : '#6b7280', textAlign: 'center', lineHeight: 1.3, fontWeight: pickedPack === pack.id ? 700 : 400 }}>
                                    {pack.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {claimError && (
                        <p style={{ fontSize: '0.72rem', color: '#f87171', textAlign: 'center', margin: 0 }}>{claimError}</p>
                    )}

                    {claimed ? (
                        <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>
                            ✓ Pack added to your inbox!
                        </div>
                    ) : (
                        <button
                            onClick={claimPack}
                            disabled={!pickedPack || claiming}
                            style={{
                                padding: '11px',
                                background: pickedPack ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.04)',
                                border: pickedPack ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12, fontSize: '0.85rem', fontWeight: 700,
                                color: pickedPack ? '#fff' : '#374151',
                                cursor: pickedPack && !claiming ? 'pointer' : 'not-allowed',
                                transition: 'all 200ms ease',
                            }}
                        >
                            {claiming ? 'Claiming…' : pickedPack ? `Claim ${PACKS.find(p => p.id === pickedPack)?.name}` : 'Select a pack above'}
                        </button>
                    )}

                    <button
                        onClick={() => setPhase('tutorial')}
                        style={{
                            background: 'none', border: 'none',
                            fontSize: '0.66rem', color: '#1f2937',
                            cursor: 'pointer', padding: 0, textAlign: 'center',
                        }}
                    >
                        Skip for now
                    </button>
                </div>
            </div>,
            document.body,
        )
    }

    // ── TUTORIAL STEPS ────────────────────────────────────────────────────────
    const isLast    = step === STEPS.length - 1
    const hasTarget = !!current?.target

    const hole: Hole | null = targetRect ? {
        top:    targetRect.top    - PAD,
        left:   targetRect.left   - PAD,
        right:  targetRect.right  + PAD,
        bottom: targetRect.bottom + PAD,
        width:  targetRect.width  + PAD * 2,
        height: targetRect.height + PAD * 2,
    } : null

    const tooltipAbove = targetRect && !current?.tooltipAnchor
        ? targetRect.top > (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400)
        : false

    return createPortal(
        <>
            {hasTarget && hole ? (
                <>
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: 0,           left: 0, right: 0,           height: hole.top   }} />
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: hole.bottom,  left: 0, right: 0,           bottom: 0          }} />
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: hole.top,     left: 0, width: hole.left,   height: hole.height }} />
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: hole.top,     left: hole.right, right: 0, height: hole.height }} />

                    <div style={{
                        position: 'fixed', zIndex: Z.ring, pointerEvents: 'none',
                        top: hole.top, left: hole.left, width: hole.width, height: hole.height,
                        borderRadius: 12,
                        border: '2px solid rgba(168,85,247,0.9)',
                        boxShadow: '0 0 0 4px rgba(168,85,247,0.2), 0 0 28px rgba(168,85,247,0.45)',
                        animation: 'tut-ring-pulse 2s ease-in-out infinite',
                    }} />

                    <div style={{ position: 'fixed', zIndex: Z.intercept, cursor: 'pointer', top: hole.top, left: hole.left, width: hole.width, height: hole.height }} onClick={tutorialNext} />

                    <div style={{
                        position: 'fixed', zIndex: Z.tooltip,
                        left: '50%', transform: 'translateX(-50%)',
                        width: 'min(360px, calc(100vw - 32px))',
                        ...(current?.tooltipAnchor === 'inside-top'
                            ? { top: hole.top + 14 }
                            : tooltipAbove
                                ? { bottom: window.innerHeight - hole.top + 14 }
                                : { top: hole.bottom + 14 }
                        ),
                        background: 'linear-gradient(160deg,#0e0e1a 0%,#0a0a12 100%)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: 14, padding: '16px 18px 14px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
                    }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                            {STEPS.map((_, i) => (
                                <div key={i} style={{
                                    width: i === step ? 16 : 5, height: 5, borderRadius: 3,
                                    background: i === step ? '#a855f7' : 'rgba(255,255,255,0.1)',
                                    transition: 'all 250ms',
                                }} />
                            ))}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f3f4f6', marginBottom: 6 }}>
                            {current?.title}
                        </div>
                        <p style={{ fontSize: '0.76rem', color: '#9ca3af', lineHeight: 1.6, margin: '0 0 10px' }}>
                            {current?.body}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.66rem', color: '#a855f7', fontWeight: 600 }}>{current?.prompt}</span>
                            <button onClick={dismiss} style={{ background: 'none', border: 'none', fontSize: '0.62rem', color: '#374151', cursor: 'pointer', padding: 0 }}>Skip</button>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: Z.modal,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 20px',
                }}>
                    <div style={{
                        background: 'linear-gradient(160deg,#0e0e1a 0%,#0a0a12 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 20, width: '100%', maxWidth: 420,
                        padding: '32px 28px 24px',
                        display: 'flex', flexDirection: 'column', gap: 20,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                    }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                            {STEPS.map((_, i) => (
                                <div key={i} style={{
                                    width: i === step ? 18 : 6, height: 6, borderRadius: 3,
                                    background: i === step ? '#a855f7' : 'rgba(255,255,255,0.1)',
                                    transition: 'all 300ms ease',
                                }} />
                            ))}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f3f4f6', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                                {current?.title}
                            </h2>
                            <p style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                                {current?.body}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {step > 0 ? (
                                <button onClick={tutorialPrev} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: '0.78rem', color: '#6b7280', cursor: 'pointer' }}>Back</button>
                            ) : (
                                <button onClick={dismiss} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', fontSize: '0.72rem', color: '#374151', cursor: 'pointer' }}>Skip</button>
                            )}
                            <button onClick={tutorialNext} style={{
                                flex: 2, padding: '10px 16px',
                                background: isLast ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(168,85,247,0.15)',
                                border: `1px solid ${isLast ? 'transparent' : 'rgba(168,85,247,0.3)'}`,
                                borderRadius: 10, fontSize: '0.82rem', fontWeight: 700,
                                color: isLast ? '#fff' : '#c084fc', cursor: 'pointer', transition: 'all 150ms ease',
                            }}>
                                {isLast ? "Let's go" : 'Next'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.58rem', color: '#1f2937', textAlign: 'center', margin: 0 }}>
                            {step + 1} of {STEPS.length}
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes tut-ring-pulse {
                    0%,100% { box-shadow: 0 0 0 4px rgba(168,85,247,0.2), 0 0 28px rgba(168,85,247,0.45); }
                    50%     { box-shadow: 0 0 0 7px rgba(168,85,247,0.3), 0 0 44px rgba(168,85,247,0.6); }
                }
            `}</style>
        </>,
        document.body,
    )
}
