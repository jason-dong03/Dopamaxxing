'use client'

import { useState } from 'react'
import {
    RARITY_ORDER,
    RARITY_COLOR,
    isRainbow,
    type Rarity,
} from '@/lib/rarityConfig'
import {
    type AutoCompletePrefs,
    type CardAction,
    savePrefs,
    DEFAULT_PREFS,
} from '@/lib/autoCompletePref'

const PREMIUM_RARITIES = RARITY_ORDER.filter((r) => r !== 'Common')

const ACTIONS: {
    value: CardAction
    label: string
    color: string
    bg: string
    border: string
}[] = [
    {
        value: 'add',
        label: 'Add',
        color: '#4ade80',
        bg: 'rgba(74,222,128,0.08)',
        border: 'rgba(74,222,128,0.3)',
    },
    {
        value: 'feed',
        label: 'Feed',
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.08)',
        border: 'rgba(168,85,247,0.3)',
    },
    {
        value: 'sell',
        label: 'Sell',
        color: '#eab308',
        bg: 'rgba(234,179,8,0.08)',
        border: 'rgba(234,179,8,0.3)',
    },
    {
        value: 'skip',
        label: 'Skip',
        color: '#6b7280',
        bg: 'transparent',
        border: 'rgba(107,114,128,0.2)',
    },
]

type Props = {
    prefs: AutoCompletePrefs
    onSave: (prefs: AutoCompletePrefs) => void
    onClose: () => void
}

export default function AutoCompleteSettings({
    prefs,
    onSave,
    onClose,
}: Props) {
    const [bulkSell, setBulkSell] = useState<boolean>(prefs.bulk === 'sell')
    const [rarityActions, setRarityActions] = useState<
        Record<string, CardAction>
    >(
        typeof prefs.fullArt === 'object'
            ? prefs.fullArt
            : Object.fromEntries(
                  PREMIUM_RARITIES.map((r) => [r, 'add' as CardAction]),
              ),
    )

    function setRarityAction(rarity: string, action: CardAction) {
        setRarityActions((prev) => ({ ...prev, [rarity]: action }))
    }

    function handleSave() {
        const next: AutoCompletePrefs = {
            bulk: bulkSell ? 'sell' : 'skip',
            fullArt: rarityActions,
        }
        savePrefs(next)
        onSave(next)
        onClose()
    }

    function handleReset() {
        setBulkSell(true)
        setRarityActions(
            Object.fromEntries(
                PREMIUM_RARITIES.map((r) => [r, 'add' as CardAction]),
            ),
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(16px)',
            }}
            onClick={onClose}
        >
            <div
                className="relative w-full rounded-2xl flex flex-col"
                style={{
                    maxWidth: 400,
                    maxHeight: '88vh',
                    background: 'rgba(10,10,16,0.99)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                    margin: '0 1rem',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div
                    className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div>
                        <h2
                            className="text-white font-bold"
                            style={{ fontSize: '0.95rem' }}
                        >
                            autocomplete rules
                        </h2>
                        <p
                            className="text-gray-600 mt-0.5"
                            style={{ fontSize: '0.6rem' }}
                        >
                            applied when you hit ⚡ autocomplete
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-700 hover:text-white transition-colors ml-4"
                        style={{ fontSize: '1rem' }}
                    >
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
                    {/* bulk section */}
                    <div
                        className="flex items-center justify-between p-4 rounded-xl"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <div>
                            <p
                                className="text-white font-semibold"
                                style={{ fontSize: '0.8rem' }}
                            >
                                ⬜ bulk
                            </p>
                            <p
                                className="text-gray-600 mt-0.5"
                                style={{ fontSize: '0.58rem' }}
                            >
                                Common cards only
                            </p>
                        </div>
                        {/* sell toggle */}
                        <button
                            onClick={() => setBulkSell((prev) => !prev)}
                            className="px-4 py-1.5 rounded-lg font-semibold transition-all"
                            style={{
                                fontSize: '0.65rem',
                                background: bulkSell
                                    ? 'rgba(234,179,8,0.08)'
                                    : 'transparent',
                                border: bulkSell
                                    ? '1px solid rgba(234,179,8,0.3)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                color: bulkSell ? '#eab308' : '#4b5563',
                            }}
                        >
                            {bulkSell ? '🪙 sell' : 'skip'}
                        </button>
                    </div>

                    {/* premium section */}
                    <div
                        className="flex flex-col rounded-xl overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <div
                            className="px-4 py-3"
                            style={{
                                background: 'rgba(255,255,255,0.02)',
                                borderBottom:
                                    '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <p
                                className="text-white font-semibold"
                                style={{ fontSize: '0.8rem' }}
                            >
                                ✨ premium
                            </p>
                            <p
                                className="text-gray-600 mt-0.5"
                                style={{ fontSize: '0.58rem' }}
                            >
                                Uncommon and above
                            </p>
                        </div>

                        {PREMIUM_RARITIES.map((rarity, idx) => {
                            const rainbow = isRainbow(rarity as Rarity)
                            const rarityColor = rainbow
                                ? '#f472b4'
                                : (RARITY_COLOR[rarity as Rarity] ?? '#9ca3af')
                            const current = rarityActions[rarity] ?? 'add'
                            const isLast = idx === PREMIUM_RARITIES.length - 1

                            return (
                                <div
                                    key={rarity}
                                    className="flex items-center justify-between px-4 py-2.5"
                                    style={{
                                        borderBottom: isLast
                                            ? 'none'
                                            : '1px solid rgba(255,255,255,0.04)',
                                        background: 'rgba(255,255,255,0.01)',
                                    }}
                                >
                                    <span
                                        className="font-bold uppercase tracking-widest flex-shrink-0"
                                        style={{
                                            fontSize: '0.58rem',
                                            color: rarityColor,
                                            width: 72,
                                        }}
                                    >
                                        {rarity}
                                    </span>
                                    <div className="flex gap-1.5">
                                        {ACTIONS.map((a) => {
                                            const isActive = current === a.value
                                            return (
                                                <button
                                                    key={a.value}
                                                    onClick={() =>
                                                        setRarityAction(
                                                            rarity,
                                                            a.value,
                                                        )
                                                    }
                                                    className="px-2 py-1 rounded-md font-semibold transition-all"
                                                    style={{
                                                        fontSize: '0.55rem',
                                                        background: isActive
                                                            ? a.bg
                                                            : 'transparent',
                                                        border: isActive
                                                            ? `1px solid ${a.border}`
                                                            : '1px solid rgba(255,255,255,0.05)',
                                                        color: isActive
                                                            ? a.color
                                                            : '#4b5563',
                                                    }}
                                                >
                                                    {a.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* footer */}
                <div
                    className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <button
                        onClick={handleReset}
                        className="text-gray-700 hover:text-gray-400 transition-colors"
                        style={{ fontSize: '0.62rem' }}
                    >
                        reset to defaults
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-xl font-semibold transition-all active:scale-95"
                        style={{
                            fontSize: '0.7rem',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                        }}
                    >
                        save
                    </button>
                </div>
            </div>
        </div>
    )
}
