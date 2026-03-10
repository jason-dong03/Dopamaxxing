'use client'

import { useState } from 'react'
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

export default function QuestsView({ completedQuestIds, metrics }: Props) {
    const [activeCategory, setActiveCategory] = useState<'all' | QuestCategory>('all')
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [claimNotes, setClaimNotes] = useState('')
    const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set())
    const [claimedRewards, setClaimedRewards] = useState<Record<string, { coins: number; xp: number }>>({})
    const [claiming, setClaiming] = useState(false)

    const allCompleted = new Set([...completedQuestIds, ...localCompleted])

    const filtered =
        activeCategory === 'all'
            ? QUEST_CATALOG
            : QUEST_CATALOG.filter((q) => q.category === activeCategory)

    // sort: uncompleted first, then by difficulty
    const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
    const sorted = [...filtered].sort((a, b) => {
        const aDone = allCompleted.has(a.id) ? 1 : 0
        const bDone = allCompleted.has(b.id) ? 1 : 0
        if (aDone !== bDone) return aDone - bDone
        // auto quests that are ready to claim float up
        const aReady = a.type === 'auto' && isAutoComplete(a, metrics) ? -1 : 0
        const bReady = b.type === 'auto' && isAutoComplete(b, metrics) ? -1 : 0
        if (aReady !== bReady) return aReady - bReady
        return diffOrder[a.difficulty] - diffOrder[b.difficulty]
    })

    const completedCount = QUEST_CATALOG.filter((q) => allCompleted.has(q.id)).length

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
                setLocalCompleted((prev) => new Set(prev).add(quest.id))
                setClaimedRewards((prev) => ({ ...prev, [quest.id]: quest.reward }))
                setClaimingId(null)
                setClaimNotes('')
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
                    {completedCount} / {QUEST_CATALOG.length} completed
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
                        completed={allCompleted.has(quest.id)}
                        reward={claimedRewards[quest.id]}
                        metrics={metrics}
                        isExpanded={claimingId === quest.id}
                        notes={claimNotes}
                        claiming={claiming}
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
    reward,
    metrics,
    isExpanded,
    notes,
    claiming,
    onExpand,
    onNotesChange,
    onClaim,
    onAutoClaim,
}: {
    quest: Quest
    completed: boolean
    reward?: { coins: number; xp: number }
    metrics: Metrics
    isExpanded: boolean
    notes: string
    claiming: boolean
    onExpand: () => void
    onNotesChange: (v: string) => void
    onClaim: () => void
    onAutoClaim: () => void
}) {
    const meta = CATEGORY_META[quest.category]
    const diffColor = DIFFICULTY_COLOR[quest.difficulty]
    const isAuto = quest.type === 'auto'
    const progress = isAuto ? getProgress(quest, metrics) : 0
    const isReady = isAuto && progress >= 1 && !completed

    return (
        <div
            style={{
                background: completed
                    ? 'rgba(255,255,255,0.02)'
                    : isReady
                      ? `${meta.color}0d`
                      : 'rgba(255,255,255,0.03)',
                border: completed
                    ? '1px solid rgba(255,255,255,0.04)'
                    : isReady
                      ? `1px solid ${meta.color}40`
                      : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '14px 16px',
                transition: 'all 200ms ease',
                opacity: completed ? 0.55 : 1,
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
                    filter: completed ? 'grayscale(0.6)' : 'none',
                }}>
                    {completed ? '✓' : quest.icon}
                </div>

                {/* content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: completed ? '#6b7280' : '#e5e7eb',
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
                            {reward && (
                                <span style={{ color: '#ca8a04' }}>+{reward.coins}🪙</span>
                            )}
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
                </div>
            </div>

            {/* self-report expand panel */}
            {isExpanded && !completed && (
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
