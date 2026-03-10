'use client'
import { useState } from 'react'
import { PACKS, type Pack } from '@/lib/packs'
import PackOpening from './PackOpening'
import CrateOpening from './CrateOpening'

export default function PackSelector() {
    const [selectedPack, setSelectedPack] = useState<Pack | null>(null)
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    if (selectedPack) {
        return selectedPack.aspect === 'box' ? (
            <CrateOpening pack={selectedPack} onBack={() => setSelectedPack(null)} />
        ) : (
            <PackOpening pack={selectedPack} onBack={() => setSelectedPack(null)} />
        )
    }

    const packs = PACKS.filter((p) => p.aspect === 'pack')
    const boxes = PACKS.filter((p) => p.aspect === 'box')

    return (
        <div className="flex flex-col items-center mt-10 gap-10 pb-16">
            {/* packs section */}
            {packs.length > 0 && (
                <section className="w-full max-w-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3 px-1">
                        <span
                            className="text-gray-600 tracking-widest uppercase"
                            style={{
                                fontSize: '0.58rem',
                                letterSpacing: '0.18em',
                            }}
                        >
                            packs
                        </span>
                        <div
                            className="flex-1 h-px"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                        />
                    </div>

                    <div className="flex flex-wrap justify-center gap-5">
                        {packs.map((pack) => (
                            <PackCard
                                key={pack.id}
                                pack={pack}
                                hovered={hoveredId === pack.id}
                                onHover={setHoveredId}
                                onSelect={setSelectedPack}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* boxes section */}
            {boxes.length > 0 && (
                <section className="w-full max-w-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3 px-1">
                        <span
                            className="text-gray-600 tracking-widest uppercase"
                            style={{
                                fontSize: '0.58rem',
                                letterSpacing: '0.18em',
                            }}
                        >
                            special boxes
                        </span>
                        <div
                            className="flex-1 h-px"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                        />
                    </div>

                    <div className="flex flex-wrap justify-center gap-5">
                        {boxes.map((pack) => (
                            <BoxCard
                                key={pack.id}
                                pack={pack}
                                hovered={hoveredId === pack.id}
                                onHover={setHoveredId}
                                onSelect={setSelectedPack}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

// ─── pack card (portrait) ─────────────────────────────────────────────────────
function PackCard({
    pack,
    hovered,
    onHover,
    onSelect,
}: {
    pack: Pack
    hovered: boolean
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
}) {
    return (
        <button
            onClick={() => onSelect(pack)}
            onMouseEnter={() => onHover(pack.id)}
            onMouseLeave={() => onHover(null)}
            className="flex flex-col items-center gap-2 group"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
            <div
                style={{
                    transition:
                        'transform 300ms cubic-bezier(0.34,1.56,0.64,1), filter 300ms ease',
                    transform: hovered
                        ? 'translateY(-10px) scale(1.04)'
                        : 'translateY(0) scale(1)',
                    filter: hovered
                        ? 'drop-shadow(0 0 24px rgba(228,228,228,0.7))'
                        : 'drop-shadow(0 0 10px rgba(228,228,228,0.2))',
                }}
            >
                <img
                    src={pack.image}
                    alt={pack.name}
                    style={{
                        height: '200px',
                        width: 'auto',
                        objectFit: 'contain',
                    }}
                />
            </div>
            <div className="flex flex-col items-center gap-0.5">
                <p
                    className="font-semibold transition-colors"
                    style={{
                        fontSize: '0.72rem',
                        color: hovered ? '#fff' : '#6b7280',
                    }}
                >
                    {pack.name}
                </p>
                <p style={{ fontSize: '0.55rem', color: '#374151' }}>
                    {pack.description}
                </p>
            </div>
        </button>
    )
}

// ─── box card (landscape with border frame) ───────────────────────────────────
function BoxCard({
    pack,
    hovered,
    onHover,
    onSelect,
}: {
    pack: Pack
    hovered: boolean
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
}) {
    return (
        <button
            onClick={() => onSelect(pack)}
            onMouseEnter={() => onHover(pack.id)}
            onMouseLeave={() => onHover(null)}
            className="flex flex-col items-center gap-2 group"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
            <div
                style={{
                    position: 'relative',
                    borderRadius: '12px',
                    padding: '2px',
                    background: hovered
                        ? 'linear-gradient(135deg, rgba(234,179,8,0.6), rgba(255,255,255,0.15), rgba(234,179,8,0.6))'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    transition: 'all 300ms cubic-bezier(0.34,1.56,0.64,1)',
                    transform: hovered
                        ? 'translateY(-8px) scale(1.03)'
                        : 'translateY(0) scale(1)',
                    boxShadow: hovered
                        ? '0 12px 40px rgba(234,179,8,0.25), 0 4px 16px rgba(0,0,0,0.4)'
                        : '0 4px 16px rgba(0,0,0,0.3)',
                }}
            >
                <div
                    style={{
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: 'rgba(8,8,12,0.95)',
                        width: '200px',
                        height: '140px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                            maxWidth: '188px',
                            maxHeight: '128px',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                        }}
                    />
                </div>

                {/* special box badge */}
                <div
                    style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(234,179,8,0.15)',
                        border: '1px solid rgba(234,179,8,0.3)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontSize: '0.45rem',
                        color: '#eab308',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                    }}
                >
                    special
                </div>
            </div>

            <div className="flex flex-col items-center gap-0.5">
                <p
                    className="font-semibold transition-colors"
                    style={{
                        fontSize: '0.72rem',
                        color: hovered ? '#fff' : '#6b7280',
                    }}
                >
                    {pack.name}
                </p>
                <p style={{ fontSize: '0.55rem', color: '#374151' }}>
                    {pack.description}
                </p>
            </div>
        </button>
    )
}
