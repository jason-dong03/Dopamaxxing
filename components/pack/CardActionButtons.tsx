'use client'
import React from 'react'

type Props = {
    doneIndex: number
    remainingCards: { coins: number }[]
    sellAllConfirm: boolean
    handleSellAll: () => void
    doSellAll: () => void
    setSellAllConfirm: (v: boolean) => void
    handleAutocomplete: (fromBack?: boolean, overrideSell?: boolean) => void
    handleStopAutocomplete: () => void
    autoRunning: boolean
    setShowSettings: (v: boolean) => void
    setDoneIndex: React.Dispatch<React.SetStateAction<number>>
}

export function CardActionButtons({
    doneIndex,
    remainingCards,
    sellAllConfirm,
    handleSellAll,
    doSellAll,
    setSellAllConfirm,
    handleAutocomplete,
    handleStopAutocomplete,
    autoRunning,
    setShowSettings,
    setDoneIndex,
}: Props) {
    return (
        <div className="flex flex-col items-center gap-2" style={{ width: '100%' }}>
            {/* arrows + counter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                <button
                    onClick={() => setDoneIndex(prev => (prev - 1 + remainingCards.length) % remainingCards.length)}
                    className="active:scale-95 transition-all"
                    style={{ border: '1px solid var(--app-border-2)', color: 'var(--app-text-secondary)', padding: '6px 12px', borderRadius: 8, fontSize: '0.875rem', background: 'transparent', cursor: 'pointer' }}
                >←</button>
                <span style={{ color: 'var(--app-text-muted)', fontSize: '0.875rem' }}>
                    {doneIndex + 1} / {remainingCards.length}
                </span>
                <button
                    onClick={() => setDoneIndex(prev => (prev + 1) % remainingCards.length)}
                    className="active:scale-95 transition-all"
                    style={{ border: '1px solid var(--app-border-2)', color: 'var(--app-text-secondary)', padding: '6px 12px', borderRadius: 8, fontSize: '0.875rem', background: 'transparent', cursor: 'pointer' }}
                >→</button>
            </div>

            {/* sell all + autocomplete + settings */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0' }}>
                {sellAllConfirm ? (
                    <>
                        <span style={{ fontSize: '0.7rem', color: '#f87171' }}>rare+ card detected — sell all?</span>
                        <button
                            onClick={doSellAll}
                            style={{ fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >yes, sell all</button>
                        <button
                            onClick={() => setSellAllConfirm(false)}
                            style={{ fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >cancel</button>
                    </>
                ) : autoRunning ? (
                    <button
                        onClick={handleStopAutocomplete}
                        className="rounded-xl text-xs font-semibold"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: 'pointer', padding: '8px 22px', whiteSpace: 'nowrap' }}
                    >⏹ stop</button>
                ) : (
                    <>
                        <button
                            onClick={handleSellAll}
                            className="rounded-xl text-xs font-semibold"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', padding: '8px 14px', whiteSpace: 'nowrap' }}
                        >
                            sell all{' '}
                            <span style={{ opacity: 0.7 }}>
                                (${remainingCards.reduce((s, c) => s + c.coins, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                        </button>
                        <button
                            onClick={() => handleAutocomplete(false)}
                            className="btn-autocomplete rounded-xl text-xs font-semibold"
                            style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}
                        >⚡ auto</button>
                        <button
                            onClick={() => handleAutocomplete(true)}
                            className="btn-autocomplete rounded-xl text-xs font-semibold"
                            style={{ padding: '8px 14px', whiteSpace: 'nowrap', opacity: 0.75 }}
                            title="Start from last card"
                        >⚡↩</button>
                        <button
                            onClick={() => handleAutocomplete(false, true)}
                            className="rounded-xl text-xs font-semibold"
                            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#eab308', cursor: 'pointer', padding: '8px 14px', whiteSpace: 'nowrap' }}
                            title="Autocomplete — sell everything"
                        >💰 sell all</button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="btn-icon p-2"
                        >⚙</button>
                    </>
                )}
            </div>
        </div>
    )
}
