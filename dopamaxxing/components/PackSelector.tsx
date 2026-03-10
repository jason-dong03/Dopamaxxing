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
            <CrateOpening
                pack={selectedPack}
                onBack={() => setSelectedPack(null)}
            />
        ) : (
            <PackOpening
                pack={selectedPack}
                onBack={() => setSelectedPack(null)}
            />
        )
    }

    const packs = PACKS.filter((p) => p.aspect === 'pack')
    const boxes = PACKS.filter((p) => p.aspect === 'box')

    return (
        <div
            style={{
                width: '100%',
                maxWidth: 860,
                margin: '0 auto',
                padding: '28px 20px 96px',
            }}
        >
            {packs.length > 0 && (
                <section style={{ marginBottom: 48 }}>
                    <SectionHeader title="packs" />
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: 20,
                        }}
                    >
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

            {boxes.length > 0 && (
                <section>
                    <SectionHeader title="special boxes" gold />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                        }}
                    >
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

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({
    title,
    gold,
}: {
    title: string
    gold?: boolean
}) {
    const lineColor = gold
        ? 'rgba(234,179,8,0.18)'
        : 'rgba(255,255,255,0.05)'
    const textColor = gold ? '#92400e' : '#374151'
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 20,
            }}
        >
            <div style={{ flex: 1, height: 1, background: lineColor }} />
            <span
                style={{
                    fontSize: '0.56rem',
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: textColor,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                }}
            >
                {title}
            </span>
            <div style={{ flex: 1, height: 1, background: lineColor }} />
        </div>
    )
}

// ─── pack card (portrait grid) ────────────────────────────────────────────────
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
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                width: '100%',
            }}
        >
            {/* framed card */}
            <div
                style={{
                    width: '100%',
                    borderRadius: 12,
                    padding: 2,
                    background: hovered
                        ? 'linear-gradient(160deg, rgba(255,255,255,0.2), rgba(255,255,255,0.04), rgba(255,255,255,0.1))'
                        : 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
                    transition:
                        'all 350ms cubic-bezier(0.34,1.56,0.64,1)',
                    transform: hovered ? 'translateY(-12px)' : 'none',
                    boxShadow: hovered
                        ? '0 20px 52px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)'
                        : '0 4px 16px rgba(0,0,0,0.3)',
                }}
            >
                <div
                    style={{
                        borderRadius: 10,
                        background: 'rgba(5,5,10,0.95)',
                        aspectRatio: '2/3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: 12,
                    }}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            filter: hovered
                                ? 'drop-shadow(0 0 20px rgba(228,228,228,0.6))'
                                : 'drop-shadow(0 0 6px rgba(228,228,228,0.12))',
                            transition: 'filter 350ms ease',
                        }}
                    />
                </div>
            </div>

            {/* label */}
            <div style={{ textAlign: 'center', width: '100%' }}>
                <p
                    style={{
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: hovered ? '#e5e7eb' : '#6b7280',
                        letterSpacing: '0.04em',
                        transition: 'color 300ms',
                        margin: 0,
                    }}
                >
                    {pack.name}
                </p>
                <p style={{ fontSize: '0.52rem', color: '#374151', marginTop: 2 }}>
                    {pack.description}
                </p>
                <p style={{ fontSize: '0.55rem', color: '#92400e', marginTop: 3 }}>
                    🪙 {pack.cost}
                </p>
            </div>
        </button>
    )
}

// ─── box card (full-width featured) ──────────────────────────────────────────
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
            style={{
                width: '100%',
                background: hovered
                    ? 'linear-gradient(135deg, rgba(234,179,8,0.07) 0%, rgba(8,8,14,0.98) 100%)'
                    : 'rgba(255,255,255,0.015)',
                border: hovered
                    ? '1px solid rgba(234,179,8,0.28)'
                    : '1px solid rgba(255,255,255,0.05)',
                borderRadius: 14,
                padding: '18px 22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 350ms cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: hovered
                    ? '0 0 44px rgba(234,179,8,0.1), 0 8px 32px rgba(0,0,0,0.4)'
                    : '0 2px 10px rgba(0,0,0,0.2)',
            }}
        >
            {/* ambient glow behind image */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 180,
                    background:
                        'radial-gradient(ellipse at 70px center, rgba(234,179,8,0.1) 0%, transparent 70%)',
                    opacity: hovered ? 1 : 0,
                    transition: 'opacity 400ms ease',
                    pointerEvents: 'none',
                }}
            />

            {/* pack image */}
            <div
                style={{
                    flexShrink: 0,
                    zIndex: 1,
                    transition:
                        'transform 350ms cubic-bezier(0.34,1.56,0.64,1), filter 350ms ease',
                    transform: hovered
                        ? 'scale(1.07) translateY(-2px)'
                        : 'scale(1)',
                    filter: hovered
                        ? 'drop-shadow(0 0 24px rgba(234,179,8,0.7))'
                        : 'drop-shadow(0 0 8px rgba(234,179,8,0.22))',
                }}
            >
                <img
                    src={pack.image}
                    alt={pack.name}
                    style={{
                        height: 88,
                        width: 'auto',
                        objectFit: 'contain',
                    }}
                />
            </div>

            {/* info */}
            <div style={{ flex: 1, zIndex: 1, minWidth: 0 }}>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: 'rgba(234,179,8,0.1)',
                        border: '1px solid rgba(234,179,8,0.22)',
                        borderRadius: 4,
                        padding: '1px 7px',
                        fontSize: '0.45rem',
                        color: '#ca8a04',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginBottom: 8,
                    }}
                >
                    ✦ special
                </div>
                <p
                    style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: hovered ? '#fff' : '#d1d5db',
                        letterSpacing: '0.02em',
                        margin: '0 0 4px',
                        transition: 'color 300ms',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {pack.name}
                </p>
                <p style={{ fontSize: '0.6rem', color: '#4b5563', margin: '0 0 6px' }}>
                    {pack.description}
                </p>
                <p style={{ fontSize: '0.6rem', color: '#92400e' }}>
                    🪙 {pack.cost} coins
                </p>
            </div>

            {/* arrow CTA */}
            <div
                style={{
                    flexShrink: 0,
                    zIndex: 1,
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
                    transition: 'all 300ms ease',
                    color: '#eab308',
                    fontSize: '1.1rem',
                }}
            >
                →
            </div>
        </button>
    )
}
