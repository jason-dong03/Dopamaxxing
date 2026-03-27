'use client'

import { useState } from 'react'

type Mode = 'both' | 'spd' | 'moves' | 'type' | 'fix-moves'

const MODE_DESC: Record<Mode, string> = {
    both:       'Fill missing stat_spd + moves on user_cards (50/run)',
    spd:        'Fill missing stat_spd on user_cards (50/run)',
    moves:      'Fill missing move sets on user_cards with moves=null (50/run)',
    type:       'Fill missing pokemon_type on cards table (50/run)',
    'fix-moves':'Replace invalid moves (mimic, reflect type, etc.) in cards that already have moves. Keeps valid slots, replaces only broken ones with level-gated alternatives (25/run — run repeatedly until Done).',
}

export default function BackfillTab() {
    const [mode, setMode] = useState<Mode>('type')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ updated: number; nextOffset?: number | null; errors?: string[]; remaining?: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [offset, setOffset] = useState(0)

    async function run() {
        setLoading(true); setResult(null); setError(null)
        try {
            const res = await fetch('/api/admin/backfill-card-stats', {
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

    return (
        <div style={{ maxWidth: 520 }}>
            <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px' }}>Backfill</h2>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 16px' }}>
                Populate missing data. Run repeatedly until "Done."
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {(['type', 'both', 'spd', 'moves', 'fix-moves'] as Mode[]).map(m => (
                    <button key={m} onClick={() => handleModeChange(m)} style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        background: mode === m ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                        border: mode === m ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        color: mode === m ? '#60a5fa' : '#64748b',
                    }}>{m}</button>
                ))}
            </div>
            <p style={{ fontSize: '0.66rem', color: '#4b5563', margin: '0 0 16px', lineHeight: 1.5 }}>{MODE_DESC[mode]}</p>

            {mode === 'fix-moves' && offset > 0 && (
                <p style={{ fontSize: '0.65rem', color: '#818cf8', margin: '0 0 10px' }}>Offset: {offset} (continuing from last run)</p>
            )}

            <button onClick={run} disabled={loading} style={{
                padding: '9px 22px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(74,222,128,0.12)',
                border: loading ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(74,222,128,0.4)',
                color: loading ? '#4b5563' : '#4ade80', marginBottom: 16,
            }}>
                {loading ? 'Running...' : 'Run Backfill'}
            </button>

            {error && (
                <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.72rem' }}>
                    {error}
                </div>
            )}
            {result && (
                <div style={{ padding: '12px 14px', borderRadius: 6, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80' }}>Updated {result.updated}</span>
                    {result.remaining && <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>{result.remaining}</span>}
                    {result.errors?.map((e, i) => <span key={i} style={{ fontSize: '0.62rem', color: '#f87171' }}>{e}</span>)}
                </div>
            )}
        </div>
    )
}
