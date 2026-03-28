'use client'

import { useState } from 'react'

type Mode = 'insert' | 'enrich' | 'backfill'

const MODE_DESC: Record<Mode, string> = {
    insert:   'Step 1 — Insert all 460 valid moves into the moves table with basic data from the PDF. Also copies known MOVE_EXTRAS directly. Run once.',
    enrich:   'Step 2 — Fetch effect text from PokeAPI + run Groq classification for buff/heal/debuff moves not already covered by MOVE_EXTRAS. Run 20/batch repeatedly until Done.',
    backfill: 'Step 3 — Backfill user_cards.moves using the enriched moves table + level gate. Run 25 cards/batch repeatedly until Done.',
}

export default function SeedMovesTab() {
    const [mode, setMode] = useState<Mode>('insert')
    const [loading, setLoading] = useState(false)
    const [offset, setOffset] = useState(0)
    const [result, setResult] = useState<{
        inserted?: number
        seeded?: number
        updated?: number
        nextOffset?: number | null
        errors?: string[]
        remaining?: string
        message?: string
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function run() {
        setLoading(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch('/api/admin/seed-moves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, offset }),
            })
            const json = await res.json()
            if (!res.ok) {
                setError(json.error ?? 'Unknown error')
            } else {
                setResult(json)
                if (json.nextOffset != null) setOffset(json.nextOffset)
                else setOffset(0)
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    function handleModeChange(m: Mode) {
        setMode(m)
        setOffset(0)
        setResult(null)
        setError(null)
    }

    const isDone = result?.remaining === 'Done.' || result?.message?.includes('inserted')

    return (
        <div style={{ maxWidth: 560 }}>
            <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px' }}>Seed Move Library</h2>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                Populates the <code style={{ color: '#94a3b8' }}>moves</code> table from the 460 valid moves in the PDF. Run steps 1→2→3 in order.
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {(['insert', 'enrich', 'backfill'] as Mode[]).map(m => (
                    <button key={m} onClick={() => handleModeChange(m)} style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        background: mode === m ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                        border: mode === m ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        color: mode === m ? '#60a5fa' : '#64748b',
                    }}>
                        {m === 'insert' ? '1. Insert' : m === 'enrich' ? '2. Enrich' : '3. Backfill'}
                    </button>
                ))}
            </div>
            <p style={{ fontSize: '0.66rem', color: '#4b5563', margin: '0 0 16px', lineHeight: 1.5 }}>{MODE_DESC[mode]}</p>

            {(mode !== 'insert') && offset > 0 && (
                <p style={{ fontSize: '0.65rem', color: '#818cf8', margin: '0 0 10px' }}>
                    Offset: {offset} — continuing from last batch
                </p>
            )}

            <button onClick={run} disabled={loading} style={{
                padding: '9px 22px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(74,222,128,0.12)',
                border: loading ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(74,222,128,0.4)',
                color: loading ? '#4b5563' : '#4ade80', marginBottom: 16,
            }}>
                {loading ? 'Running...' : `Run ${mode === 'insert' ? 'Insert' : mode === 'enrich' ? 'Enrich Batch' : 'Backfill Batch'}`}
            </button>

            {error && (
                <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.72rem' }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{ padding: '12px 14px', borderRadius: 6, background: isDone ? 'rgba(74,222,128,0.06)' : 'rgba(96,165,250,0.06)', border: `1px solid ${isDone ? 'rgba(74,222,128,0.2)' : 'rgba(96,165,250,0.2)'}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {result.message && <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4ade80' }}>{result.message}</span>}
                    {result.inserted != null && <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4ade80' }}>Inserted {result.inserted} moves</span>}
                    {result.seeded != null && <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#60a5fa' }}>Enriched {result.seeded} moves this batch</span>}
                    {result.updated != null && <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#a78bfa' }}>Updated {result.updated} cards this batch</span>}
                    {result.remaining && <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>{result.remaining}</span>}
                    {result.errors?.map((e, i) => (
                        <span key={i} style={{ fontSize: '0.6rem', color: '#f87171' }}>{e}</span>
                    ))}
                    {!isDone && mode !== 'insert' && (
                        <button onClick={run} disabled={loading} style={{
                            marginTop: 6, padding: '5px 14px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                            cursor: 'pointer', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa',
                        }}>
                            Continue Next Batch →
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
