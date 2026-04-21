'use client'
import { useState } from 'react'

export default function BlackMarketTab() {
    const [duration, setDuration] = useState(60)
    const [loading, setLoading] = useState(false)
    const [closing, setClosing] = useState(false)
    const [purging, setPurging] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function forceOpen() {
        setLoading(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch('/api/admin/black-market', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ durationMinutes: duration }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Failed')
                return
            }
            const until = new Date(data.activeUntil).toLocaleTimeString()
            setResult(
                `Market opened! ID: ${data.marketId} · active until ${until}`,
            )
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    async function purgeOld() {
        setPurging(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch('/api/admin/black-market', { method: 'PATCH' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed'); return }
            setResult(`Purged ${data.purged} expired market(s).`)
        } catch {
            setError('Network error')
        } finally {
            setPurging(false)
        }
    }

    async function forceClose() {
        setClosing(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch('/api/admin/black-market', {
                method: 'DELETE',
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Failed')
                return
            }
            setResult(`Closed ${data.closed} active market(s).`)
        } catch {
            setError('Network error')
        } finally {
            setClosing(false)
        }
    }

    return (
        <div style={{ maxWidth: 480 }}>
            <h2
                style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    marginBottom: 20,
                }}
            >
                Black Market Control
            </h2>

            <div
                style={{
                    background: 'rgba(127,29,29,0.15)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 12,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label
                        style={{
                            fontSize: '0.78rem',
                            color: '#9ca3af',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Duration (min)
                    </label>
                    <input
                        type="number"
                        min={5}
                        max={360}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        style={{
                            width: 80,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#e2e8f0',
                            fontSize: '0.82rem',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={forceOpen}
                        disabled={loading}
                        style={{
                            padding: '8px 20px',
                            borderRadius: 8,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            background: loading
                                ? 'rgba(239,68,68,0.1)'
                                : 'rgba(239,68,68,0.22)',
                            border: '1px solid rgba(239,68,68,0.45)',
                            color: '#fca5a5',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                        }}
                    >
                        {loading ? 'Opening…' : 'Force Open'}
                    </button>
                    <button
                        onClick={purgeOld}
                        disabled={purging}
                        style={{
                            padding: '8px 20px', borderRadius: 8, cursor: purging ? 'not-allowed' : 'pointer',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#6b7280', fontSize: '0.78rem', fontWeight: 600,
                        }}
                    >
                        {purging ? 'Purging…' : 'Purge Old'}
                    </button>
                    <button
                        onClick={forceClose}
                        disabled={closing}
                        style={{
                            padding: '8px 20px',
                            borderRadius: 8,
                            cursor: closing ? 'not-allowed' : 'pointer',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#9ca3af',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                        }}
                    >
                        {closing ? 'Closing…' : 'Force Close'}
                    </button>
                </div>

                {result && (
                    <div
                        style={{
                            fontSize: '0.72rem',
                            color: '#4ade80',
                            background: 'rgba(74,222,128,0.08)',
                            border: '1px solid rgba(74,222,128,0.2)',
                            borderRadius: 6,
                            padding: '8px 12px',
                        }}
                    >
                        ✓ {result}
                    </div>
                )}
                {error && (
                    <div
                        style={{
                            fontSize: '0.72rem',
                            color: '#f87171',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 6,
                            padding: '8px 12px',
                        }}
                    >
                        ✗ {error}
                    </div>
                )}
            </div>
        </div>
    )
}
