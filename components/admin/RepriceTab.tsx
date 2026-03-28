'use client'

import { useState, useEffect } from 'react'

type SetInfo = { id: string; cardCount: number }

export default function RepriceTab() {
    const [sets, setSets]           = useState<SetInfo[]>([])
    const [loadingSets, setLoadingSets] = useState(true)
    const [selectedSet, setSelectedSet] = useState('')
    const [offset, setOffset]       = useState(0)
    const [running, setRunning]     = useState(false)
    const [result, setResult]       = useState<{ updated: number; message: string; nextOffset?: number | null } | null>(null)
    const [error, setError]         = useState<string | null>(null)
    const [totalUpdated, setTotalUpdated] = useState(0)

    useEffect(() => {
        fetch('/api/admin/reprice-set')
            .then(r => r.json())
            .then(d => { setSets(d.sets ?? []); setLoadingSets(false) })
            .catch(() => setLoadingSets(false))
    }, [])

    function onSetChange(id: string) {
        setSelectedSet(id)
        setOffset(0)
        setTotalUpdated(0)
        setResult(null)
        setError(null)
    }

    async function run() {
        if (!selectedSet || running) return
        setRunning(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/reprice-set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId: selectedSet, offset }),
            })
            const json = await res.json()
            if (!res.ok) {
                setError(json.error ?? 'Unknown error')
            } else {
                setResult(json)
                setTotalUpdated(prev => prev + (json.updated ?? 0))
                if (json.nextOffset != null) setOffset(json.nextOffset)
                else setOffset(0)
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setRunning(false)
        }
    }

    const isDone = result?.nextOffset === undefined && result?.message === 'Done.'
    const buttonLabel = offset > 0 ? `Continue (offset ${offset})` : 'Run Reprice'

    return (
        <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px' }}>
                Reprice Set
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 20px' }}>
                Recalculates buyback <code>worth</code> for all user_cards in the selected set using current rarity ranges and card condition. Run repeatedly until "Done." Excludes 1st edition premium (base value only).
            </p>

            {loadingSets ? (
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Loading sets…</p>
            ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <select
                        value={selectedSet}
                        onChange={e => onSetChange(e.target.value)}
                        style={{
                            flex: 1, minWidth: 200,
                            background: '#0f172a', color: '#e2e8f0',
                            border: '1px solid #1e293b', borderRadius: 8,
                            padding: '8px 12px', fontSize: '0.82rem',
                        }}
                    >
                        <option value=''>— Select a set —</option>
                        {sets.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.id} ({s.cardCount} cards)
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={run}
                        disabled={!selectedSet || running}
                        style={{
                            padding: '8px 20px', borderRadius: 8,
                            background: running ? 'rgba(96,165,250,0.08)' : 'rgba(96,165,250,0.15)',
                            border: '1px solid rgba(96,165,250,0.3)',
                            color: '#60a5fa', fontSize: '0.82rem', fontWeight: 600,
                            cursor: !selectedSet || running ? 'not-allowed' : 'pointer',
                            opacity: !selectedSet || running ? 0.5 : 1,
                        }}
                    >
                        {running ? 'Running…' : buttonLabel}
                    </button>
                </div>
            )}

            {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.78rem', marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', fontSize: '0.78rem', color: '#9ca3af', marginBottom: 12 }}>
                    <span style={{ color: isDone ? '#4ade80' : '#60a5fa', fontWeight: 600 }}>{result.message}</span>
                    {totalUpdated > 0 && <span style={{ marginLeft: 10, color: '#6b7280' }}>Total updated this run: {totalUpdated}</span>}
                </div>
            )}

            {!isDone && result && result.message !== 'Done.' && (
                <p style={{ fontSize: '0.7rem', color: '#4b5563', margin: 0 }}>
                    Click "Continue" to process the next batch.
                </p>
            )}
        </div>
    )
}
