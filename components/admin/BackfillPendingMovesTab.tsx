'use client'

import { useState } from 'react'

export default function BackfillPendingMovesTab() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        updated?: number
        skipped?: number
        remaining?: string
        errors?: string[]
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function run() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/backfill-pending-moves', { method: 'POST' })
            const json = await res.json()
            if (!res.ok) setError(json.error ?? 'Unknown error')
            else setResult(json)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const isDone = result?.remaining === 'Done.'

    return (
        <div style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px' }}>
                Backfill Pending Moves
            </h2>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                For Pokémon at level&nbsp;&gt;&nbsp;1 with no pending moves, computes moves
                learnable up to their level (excluding their active moveset) and populates{' '}
                <code style={{ color: '#94a3b8' }}>pending_moves</code>. Runs 10 cards per batch — press repeatedly until Done.
            </p>

            <button
                onClick={run}
                disabled={loading || isDone}
                style={{
                    padding: '9px 22px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                    cursor: loading || isDone ? 'not-allowed' : 'pointer', marginBottom: 16,
                    background: isDone ? 'rgba(74,222,128,0.08)' : loading ? 'rgba(255,255,255,0.04)' : 'rgba(96,165,250,0.12)',
                    border: isDone ? '1px solid rgba(74,222,128,0.3)' : loading ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(96,165,250,0.4)',
                    color: isDone ? '#4ade80' : loading ? '#4b5563' : '#60a5fa',
                }}
            >
                {loading ? 'Running...' : isDone ? 'Done ✓' : 'Run Batch (10 cards)'}
            </button>

            {error && (
                <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.72rem' }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{ padding: '12px 14px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 5, background: isDone ? 'rgba(74,222,128,0.06)' : 'rgba(96,165,250,0.06)', border: `1px solid ${isDone ? 'rgba(74,222,128,0.2)' : 'rgba(96,165,250,0.2)'}` }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#60a5fa' }}>
                        Updated {result.updated} cards this batch
                        {(result.skipped ?? 0) > 0 && (
                            <span style={{ fontWeight: 400, color: '#64748b' }}> · {result.skipped} skipped (no new moves)</span>
                        )}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: isDone ? '#4ade80' : '#6b7280' }}>
                        {result.remaining}
                    </span>
                    {result.errors?.map((e, i) => (
                        <span key={i} style={{ fontSize: '0.6rem', color: '#f87171' }}>{e}</span>
                    ))}
                    {!isDone && (
                        <button
                            onClick={run}
                            disabled={loading}
                            style={{
                                marginTop: 4, padding: '5px 14px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                                cursor: 'pointer', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa',
                            }}
                        >
                            Continue Next Batch →
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
