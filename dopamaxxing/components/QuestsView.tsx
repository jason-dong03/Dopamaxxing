'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    QUEST_CATALOG,
    CATEGORY_META,
    DIFFICULTY_COLOR,
    getProgress,
    isAutoComplete,
    type Quest,
    type QuestCategory,
} from '@/lib/quests'

type Metrics = {
    packs_opened: number
    cards_owned: number
    cards_fed: number
}

type Props = {
    completedQuestIds: Set<string>
    lastCompletedAt: Record<string, string>
    metrics: Metrics
}

const CATEGORIES: Array<{ key: 'all' | QuestCategory; label: string; icon: string }> = [
    { key: 'all', label: 'All', icon: '✦' },
    { key: 'ingame', label: 'In-Game', icon: '📦' },
    { key: 'study', label: 'Study', icon: '📚' },
    { key: 'gaming', label: 'Gaming', icon: '🎮' },
    { key: 'life', label: 'Life', icon: '🌱' },
    { key: 'entertainment', label: 'Entertain', icon: '🎵' },
]

function msLeft(lastAt: string, cooldownHours: number): number {
    const cooldownMs = cooldownHours * 60 * 60 * 1000
    return cooldownMs - (Date.now() - new Date(lastAt).getTime())
}

function formatCooldown(ms: number): string {
    if (ms <= 0) return 'Ready'
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

export default function QuestsView({ completedQuestIds, lastCompletedAt, metrics }: Props) {
    const router = useRouter()
    const [now, setNow] = useState(() => Date.now())
    const [activeCategory, setActiveCategory] = useState<'all' | QuestCategory>('all')
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [claimNotes, setClaimNotes] = useState('')
    const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set())
    const [localLastClaimed, setLocalLastClaimed] = useState<Record<string, string>>({})
    const [claimedRewards, setClaimedRewards] = useState<Record<string, { coins: number; xp: number }>>({})
    const [claiming, setClaiming] = useState(false)

    // tick every 30s to update cooldown countdowns
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30_000)
        return () => clearInterval(id)
    }, [])

    const allCompleted = new Set([...completedQuestIds, ...localCompleted])
    const mergedLastClaimed = { ...lastCompletedAt, ...localLastClaimed }

    function isOnCooldown(quest: Quest): boolean {
        if (!quest.cooldownHours) return false
        const last = mergedLastClaimed[quest.id]
        if (!last) return false
        return msLeft(last, quest.cooldownHours) > 0
    }

    function cooldownRemaining(quest: Quest): number {
        if (!quest.cooldownHours) return 0
        const last = mergedLastClaimed[quest.id]
        if (!last) return 0
        return Math.max(0, msLeft(last, quest.cooldownHours))
    }

    const filtered =
        activeCategory === 'all'
            ? QUEST_CATALOG
            : QUEST_CATALOG.filter((q) => q.category === activeCategory)

    const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
    const sorted = [...filtered].sort((a, b) => {
        const aDone = !a.cooldownHours && allCompleted.has(a.id) ? 1 : 0
        const bDone = !b.cooldownHours && allCompleted.has(b.id) ? 1 : 0
        if (aDone !== bDone) return aDone - bDone

        const aOnCD = isOnCooldown(a) ? 1 : 0
        const bOnCD = isOnCooldown(b) ? 1 : 0
        if (aOnCD !== bOnCD) return aOnCD - bOnCD

        const aReady = a.type === 'auto' && isAutoComplete(a, metrics) ? -1 : 0
        const bReady = b.type === 'auto' && isAutoComplete(b, metrics) ? -1 : 0
        if (aReady !== bReady) return aReady - bReady

        return diffOrder[a.difficulty] - diffOrder[b.difficulty]
    })

    const oneTimeCompleted = QUEST_CATALOG.filter(
        (q) => !q.cooldownHours && allCompleted.has(q.id),
    ).length
    const oneTimeTotal = QUEST_CATALOG.filter((q) => !q.cooldownHours).length

    async function handleClaim(quest: Quest) {
        if (claiming) return
        setClaiming(true)
        try {
            const res = await fetch('/api/claim-quest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId: quest.id, notes: claimNotes }),
            })
            if (res.ok) {
                const now = new Date().toISOString()
                if (!quest.cooldownHours) {
                    setLocalCompleted((prev) => new Set(prev).add(quest.id))
                }
                setLocalLastClaimed((prev) => ({ ...prev, [quest.id]: now }))
                setClaimedRewards((prev) => ({ ...prev, [quest.id]: quest.reward }))
                setClaimingId(null)
                setClaimNotes('')
                router.refresh()
            }
        } finally {
            setClaiming(false)
        }
    }

    async function handleAutoClaim(quest: Quest) {
        if (!isAutoComplete(quest, metrics) || allCompleted.has(quest.id)) return
        if (claiming) return
        setClaiming(true)
        try {
            const res = await fetch('/api/claim-quest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId: quest.id, notes: 'auto-detected' }),
            })
            if (res.ok) {
                setLocalCompleted((prev) => new Set(prev).add(quest.id))
                setClaimedRewards((prev) => ({ ...prev, [quest.id]: quest.reward }))
                router.refresh()
            }
        } finally {
            setClaiming(false)
        }
    }

    return (
        <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>

            {/* header */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                        Quests
                    </h1>
                    <p style={{ fontSize: '0.6rem', color: '#4b5563', marginTop: 2 }}>
                        complete quests to earn coins &amp; xp
                    </p>
                </div>
                <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: '0.62rem',
                    color: '#6b7280',
                }}>
                    {oneTimeCompleted} / {oneTimeTotal} one-time done
                </div>
            </div>

            {/* category tabs */}
            <div style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 4,
                marginBottom: 20,
                scrollbarWidth: 'none',
            }}>
                {CATEGORIES.map(({ key, label, icon }) => {
                    const isActive = activeCategory === key
                    const meta = key !== 'all' ? CATEGORY_META[key as QuestCategory] : null
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveCategory(key)}
                            style={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 12px',
                                borderRadius: 20,
                                fontSize: '0.65rem',
                                fontWeight: isActive ? 600 : 400,
                                cursor: 'pointer',
                                border: isActive
                                    ? `1px solid ${meta?.color ?? 'rgba(255,255,255,0.3)'}`
                                    : '1px solid rgba(255,255,255,0.07)',
                                background: isActive
                                    ? `${meta?.color ?? 'rgba(255,255,255,0.12)'}18`
                                    : 'transparent',
                                color: isActive
                                    ? meta?.color ?? '#e5e7eb'
                                    : '#6b7280',
                                transition: 'all 200ms ease',
                            }}
                        >
                            <span>{icon}</span>
                            <span>{label}</span>
                        </button>
                    )
                })}
            </div>

            {/* quest list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sorted.map((quest) => (
                    <QuestCard
                        key={quest.id}
                        quest={quest}
                        completed={!quest.cooldownHours && allCompleted.has(quest.id)}
                        onCooldown={isOnCooldown(quest)}
                        cooldownMs={cooldownRemaining(quest)}
                        reward={claimedRewards[quest.id]}
                        metrics={metrics}
                        isExpanded={claimingId === quest.id}
                        notes={claimNotes}
                        claiming={claiming}
                        now={now}
                        onExpand={() => setClaimingId(claimingId === quest.id ? null : quest.id)}
                        onNotesChange={setClaimNotes}
                        onClaim={() => handleClaim(quest)}
                        onAutoClaim={() => handleAutoClaim(quest)}
                    />
                ))}
            </div>
        </div>
    )
}

// ─── quest card ───────────────────────────────────────────────────────────────

function QuestCard({
    quest,
    completed,
    onCooldown,
    cooldownMs,
    reward,
    metrics,
    isExpanded,
    notes,
    claiming,
    now,
    onExpand,
    onNotesChange,
    onClaim,
    onAutoClaim,
}: {
    quest: Quest
    completed: boolean
    onCooldown: boolean
    cooldownMs: number
    reward?: { coins: number; xp: number }
    metrics: Metrics
    isExpanded: boolean
    notes: string
    claiming: boolean
    now: number
    onExpand: () => void
    onNotesChange: (v: string) => void
    onClaim: () => void
    onAutoClaim: () => void
}) {
    const meta = CATEGORY_META[quest.category]
    const diffColor = DIFFICULTY_COLOR[quest.difficulty]
    const isAuto = quest.type === 'auto'
    const isRepeatable = !!quest.cooldownHours
    const progress = isAuto ? getProgress(quest, metrics) : 0
    const isReady = isAuto && progress >= 1 && !completed

    const cooldownLabel = isRepeatable
        ? quest.cooldownHours === 24 ? 'DAILY' : 'WEEKLY'
        : null

    const dimmed = completed || onCooldown

    return (
        <div
            style={{
                background: dimmed
                    ? 'rgba(255,255,255,0.02)'
                    : isReady
                      ? `${meta.color}0d`
                      : 'rgba(255,255,255,0.03)',
                border: dimmed
                    ? '1px solid rgba(255,255,255,0.04)'
                    : isReady
                      ? `1px solid ${meta.color}40`
                      : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '14px 16px',
                transition: 'all 200ms ease',
                opacity: dimmed ? 0.55 : 1,
            }}
        >
            {/* main row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* icon */}
                <div style={{
                    fontSize: '1.4rem',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: `${meta.color}14`,
                    borderRadius: 8,
                    filter: dimmed ? 'grayscale(0.6)' : 'none',
                }}>
                    {completed ? '✓' : onCooldown ? '⏳' : quest.icon}
                </div>

                {/* content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: dimmed ? '#6b7280' : '#e5e7eb',
                        }}>
                            {quest.title}
                        </span>
                        {/* difficulty badge */}
                        <span style={{
                            fontSize: '0.48rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: diffColor,
                            background: `${diffColor}18`,
                            border: `1px solid ${diffColor}40`,
                            borderRadius: 4,
                            padding: '1px 5px',
                        }}>
                            {quest.difficulty}
                        </span>
                        {/* type badge */}
                        <span style={{
                            fontSize: '0.46rem',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: isAuto ? '#60a5fa' : '#c084fc',
                            background: isAuto ? '#60a5fa18' : '#c084fc18',
                            border: `1px solid ${isAuto ? '#60a5fa' : '#c084fc'}40`,
                            borderRadius: 4,
                            padding: '1px 5px',
                        }}>
                            {isAuto ? 'auto' : 'self-report'}
                        </span>
                        {/* cooldown badge */}
                        {cooldownLabel && (
                            <span style={{
                                fontSize: '0.46rem',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                color: '#fbbf24',
                                background: '#fbbf2418',
                                border: '1px solid #fbbf2440',
                                borderRadius: 4,
                                padding: '1px 5px',
                            }}>
                                {cooldownLabel}
                            </span>
                        )}
                    </div>

                    <p style={{ fontSize: '0.65rem', color: '#6b7280', margin: '0 0 8px' }}>
                        {quest.description}
                    </p>

                    {/* auto quest progress bar */}
                    {isAuto && quest.requirement && !completed && (
                        <div style={{ marginBottom: 8 }}>
                            <div style={{
                                height: 4,
                                borderRadius: 2,
                                background: 'rgba(255,255,255,0.08)',
                                overflow: 'hidden',
                                marginBottom: 3,
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.round(progress * 100)}%`,
                                    background: isReady ? meta.color : `${meta.color}80`,
                                    borderRadius: 2,
                                    transition: 'width 600ms ease',
                                }} />
                            </div>
                            <p style={{ fontSize: '0.55rem', color: '#4b5563' }}>
                                {Math.min(metrics[quest.requirement.metric] ?? 0, quest.requirement.target)}
                                {' / '}
                                {quest.requirement.target}
                            </p>
                        </div>
                    )}

                    {/* reward row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.6rem', color: '#ca8a04' }}>
                            🪙 {quest.reward.coins}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#818cf8' }}>
                            ⭐ {quest.reward.xp} XP
                        </span>
                    </div>
                </div>

                {/* action */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {completed ? (
                        <div style={{ fontSize: '0.55rem', color: '#4b5563' }}>
                            {reward && <span style={{ color: '#ca8a04' }}>+{reward.coins}🪙</span>}
                        </div>
                    ) : onCooldown ? (
                        <div style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            color: '#4b5563',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            whiteSpace: 'nowrap',
                        }}>
                            ⏳ {formatCooldown(cooldownMs)}
                        </div>
                    ) : isAuto ? (
                        <button
                            onClick={onAutoClaim}
                            disabled={!isReady || claiming}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 8,
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                cursor: isReady ? 'pointer' : 'not-allowed',
                                background: isReady ? `${meta.color}22` : 'rgba(255,255,255,0.04)',
                                border: isReady
                                    ? `1px solid ${meta.color}50`
                                    : '1px solid rgba(255,255,255,0.06)',
                                color: isReady ? meta.color : '#374151',
                                transition: 'all 200ms',
                            }}
                        >
                            {isReady ? 'Claim ✓' : 'In Progress'}
                        </button>
                    ) : (
                        <button
                            onClick={onExpand}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 8,
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: isExpanded
                                    ? `${meta.color}22`
                                    : 'rgba(255,255,255,0.05)',
                                border: isExpanded
                                    ? `1px solid ${meta.color}50`
                                    : '1px solid rgba(255,255,255,0.08)',
                                color: isExpanded ? meta.color : '#9ca3af',
                                transition: 'all 200ms',
                            }}
                        >
                            Complete
                        </button>
                    )}
                    {/* just claimed reward flash */}
                    {reward && !completed && !onCooldown && (
                        <span style={{ fontSize: '0.52rem', color: '#ca8a04' }}>
                            +{reward.coins}🪙
                        </span>
                    )}
                </div>
            </div>

            {/* self-report expand panel */}
            {isExpanded && !completed && !onCooldown && (
                <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                    {quest.verificationHint && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 6,
                            marginBottom: 10,
                            padding: '7px 10px',
                            background: 'rgba(192,132,252,0.06)',
                            border: '1px solid rgba(192,132,252,0.15)',
                            borderRadius: 8,
                        }}>
                            <span style={{ fontSize: '0.7rem' }}>💡</span>
                            <div>
                                <p style={{ fontSize: '0.58rem', color: '#c084fc', fontWeight: 600, margin: '0 0 2px' }}>
                                    {quest.verificationHint}
                                </p>
                                {quest.verificationSuggestion && (
                                    <p style={{ fontSize: '0.55rem', color: '#6b7280', margin: 0 }}>
                                        {quest.verificationSuggestion}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <textarea
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder="Optional: add notes, proof, or what you did..."
                        rows={2}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            fontSize: '0.65rem',
                            color: '#d1d5db',
                            resize: 'none',
                            outline: 'none',
                            boxSizing: 'border-box',
                            marginBottom: 8,
                        }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                            onClick={onExpand}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 8,
                                fontSize: '0.62rem',
                                cursor: 'pointer',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.07)',
                                color: '#6b7280',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onClaim}
                            disabled={claiming}
                            style={{
                                padding: '5px 14px',
                                borderRadius: 8,
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                cursor: claiming ? 'not-allowed' : 'pointer',
                                background: `${meta.color}22`,
                                border: `1px solid ${meta.color}50`,
                                color: meta.color,
                                opacity: claiming ? 0.6 : 1,
                                transition: 'opacity 200ms',
                            }}
                        >
                            {claiming ? 'Claiming…' : 'Claim Reward 🪙'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
