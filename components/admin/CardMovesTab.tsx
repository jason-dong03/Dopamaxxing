'use client'

import { useState } from 'react'
import type { StoredMove } from '@/lib/pokemon-moves'

type CardInfo = {
    id: string
    card_level: number
    moves: StoredMove[] | null
    cards: { name: string; rarity: string; national_pokedex_number: number | null }
}

const FIELD_STYLE = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: '0.72rem',
    color: '#e2e8f0',
    width: '100%',
}

export default function CardMovesTab() {
    const [cardId, setCardId] = useState('')
    const [card, setCard] = useState<CardInfo | null>(null)
    const [moves, setMoves] = useState<StoredMove[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    async function lookup() {
        if (!cardId.trim()) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/edit-card-moves?userCardId=${cardId.trim()}`)
            const d = await res.json()
            if (!res.ok) { setError(d.error); return }
            setCard(d.card)
            setMoves(d.card.moves ?? [])
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    function updateMove(idx: number, field: keyof StoredMove, value: unknown) {
        setMoves(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
        setSaved(false)
    }

    async function save() {
        if (!card) return
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/edit-card-moves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCardId: card.id, moves }),
            })
            const d = await res.json()
            if (!res.ok) { setError(d.error); return }
            setSaved(true)
        } catch {
            setError('Network error')
        } finally {
            setSaving(false)
        }
    }

    const inputStyle = { ...FIELD_STYLE, outline: 'none' } as React.CSSProperties

    return (
        <div style={{ maxWidth: 700 }}>
            <p style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 16 }}>
                Look up a user_card by its ID (UUID) to view and edit its stored moves.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                    value={cardId}
                    onChange={e => setCardId(e.target.value)}
                    placeholder="user_card UUID…"
                    onKeyDown={e => e.key === 'Enter' && lookup()}
                    style={{ ...inputStyle, flex: 1 }}
                />
                <button
                    onClick={lookup}
                    disabled={loading}
                    style={{
                        padding: '6px 18px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                        background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.35)',
                        color: '#60a5fa', cursor: loading ? 'wait' : 'pointer',
                    }}
                >
                    {loading ? '…' : 'Look up'}
                </button>
            </div>

            {error && <p style={{ fontSize: '0.72rem', color: '#f87171', marginBottom: 12 }}>{error}</p>}

            {card && (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>{card.cards.name}</span>
                        <span style={{ fontSize: '0.65rem', color: '#6b7280', marginLeft: 8 }}>
                            {card.cards.rarity} · Lv.{card.card_level} · #{card.cards.national_pokedex_number ?? '?'}
                        </span>
                    </div>

                    {moves.length === 0 ? (
                        <p style={{ fontSize: '0.72rem', color: '#4b5563' }}>No moves stored.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {moves.map((m, i) => (
                                <div key={i} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 10, padding: '12px 14px',
                                }}>
                                    <div style={{ fontSize: '0.62rem', color: '#4b5563', marginBottom: 8 }}>
                                        Move {i + 1}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                        {([
                                            ['name', 'API name', 'text'],
                                            ['displayName', 'Display name', 'text'],
                                            ['power', 'Power (null = status)', 'number'],
                                            ['pp', 'PP', 'number'],
                                            ['type', 'Type', 'text'],
                                            ['damageClass', 'Class (physical/special/status)', 'text'],
                                            ['accuracy', 'Accuracy', 'number'],
                                            ['statusInflict', 'Status inflict', 'text'],
                                        ] as [keyof StoredMove, string, string][]).map(([field, label, type]) => (
                                            <div key={field}>
                                                <div style={{ fontSize: '0.58rem', color: '#6b7280', marginBottom: 3 }}>{label}</div>
                                                <input
                                                    type={type}
                                                    value={m[field] == null ? '' : String(m[field])}
                                                    placeholder="null"
                                                    onChange={e => {
                                                        const raw = e.target.value
                                                        if (type === 'number') {
                                                            updateMove(i, field, raw === '' ? null : Number(raw))
                                                        } else {
                                                            updateMove(i, field, raw === '' ? null : raw)
                                                        }
                                                    }}
                                                    style={inputStyle}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                        <button
                            onClick={save}
                            disabled={saving}
                            style={{
                                padding: '8px 24px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                                background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)',
                                color: '#4ade80', cursor: saving ? 'wait' : 'pointer',
                            }}
                        >
                            {saving ? 'Saving…' : 'Save moves'}
                        </button>
                        {saved && <span style={{ fontSize: '0.68rem', color: '#4ade80' }}>✓ Saved</span>}
                    </div>
                </div>
            )}
        </div>
    )
}
