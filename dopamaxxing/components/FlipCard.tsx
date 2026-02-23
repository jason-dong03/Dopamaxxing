'use client'

import { useState } from 'react'
import { RARITY_GLOW } from '@/lib/rarityConfig'

type Props = {
    card: {
        id: string
        name: string
        image_url: string
        rarity: string
    }
    onReveal: () => void
}

const SPECIAL_RARITIES = ['Legendary', 'Divine', 'Celestial', '???']

export default function FlipCard({ card, onReveal }: Props) {
    const [flipped, setFlipped] = useState(false)
    const [confirmed, setConfirmed] = useState(false)
    const [showSpecial, setShowSpecial] = useState(false)

    const glowColor = RARITY_GLOW[card.rarity] ?? '156, 163, 175'
    const isRainbow = glowColor === 'rainbow'
    const isSpecial = SPECIAL_RARITIES.includes(card.rarity)

    const glowStyle = isRainbow
        ? undefined
        : `0 0 30px 6px rgba(${glowColor}, 0.9)`

    function handleClick() {
        if (!flipped) {
            if (isSpecial) {
                setShowSpecial(true)
                setTimeout(() => {
                    setFlipped(true)
                }, 1500) // let special animation play first
            } else {
                setFlipped(true)
            }
            return
        }
        if (!confirmed) {
            setConfirmed(true)
            onReveal()
        }
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                onClick={handleClick}
                className="cursor-pointer relative"
                style={{
                    width: '260px',
                    height: '364px',
                    perspective: '1000px',
                }}
            >
                {/* Special background burst for legendary+ */}
                {showSpecial && (
                    <div
                        className="absolute inset-0 rounded-xl animate-special-bg"
                        style={{
                            background: isRainbow
                                ? 'linear-gradient(135deg, #ff000066, #ff7f0066, #ffff0066, #00ff0066, #0000ff66, #8b00ff66)'
                                : `radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, transparent 70%)`,
                            zIndex: 20,
                            pointerEvents: 'none',
                        }}
                    />
                )}

                {/* Sparkles */}
                {showSpecial && !flipped && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute animate-sparkle"
                                style={{
                                    left: `${10 + Math.random() * 80}%`,
                                    top: `${10 + Math.random() * 80}%`,
                                    animationDelay: `${i * 150}ms`,
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isRainbow
                                        ? '#fff'
                                        : `rgba(${glowColor}, 1)`,
                                }}
                            />
                        ))}
                    </div>
                )}

                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        transformStyle: 'preserve-3d',
                        transition: flipped
                            ? isSpecial
                                ? 'transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)'
                                : 'transform 600ms ease-in-out'
                            : undefined,
                        transform: flipped
                            ? 'rotateY(180deg)'
                            : 'rotateY(0deg)',
                    }}
                >
                    {/* Front - card back */}
                    <div
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            borderRadius: '12px',
                            boxShadow: flipped ? glowStyle : undefined,
                            transition: 'box-shadow 600ms ease-in-out',
                        }}
                    >
                        <img
                            src="/packs/card-back.jpg"
                            alt="Card Back"
                            className="w-full h-full object-cover rounded-xl"
                        />
                    </div>

                    {/* Back - actual card */}
                    <div
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            borderRadius: '12px',
                            boxShadow: glowStyle,
                        }}
                        className={isRainbow ? 'glow-rainbow' : ''}
                    >
                        <img
                            src={card.image_url}
                            alt={card.name}
                            className="w-full h-full object-cover rounded-xl"
                        />
                    </div>
                </div>
            </div>

            {flipped && !confirmed && (
                <p className="text-gray-500 text-xs animate-pulse">
                    tap to continue
                </p>
            )}
        </div>
    )
}
