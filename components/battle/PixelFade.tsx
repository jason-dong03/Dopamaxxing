'use client'

type Props = {
    direction: 'in' | 'out'
    onComplete?: () => void
}

export function PixelFade({ direction, onComplete }: Props) {
    // fade-in: 1s pixelated ramp to black
    // hold: stays black for 1.5s (handled by delay on fade-out in BattleScreen)
    // fade-out: 0.5s pixel dissolve back
    const animation = direction === 'in'
        ? 'pixel-fade-in 1000ms steps(12, end) forwards'
        : 'pixel-fade-out 500ms steps(8, end) forwards'

    return (
        <>
            <style>{`
                @keyframes pixel-fade-in {
                    0%   { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes pixel-fade-out {
                    0%   { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
            <div
                onAnimationEnd={onComplete}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999999,
                    background: '#000',
                    animation,
                    pointerEvents: 'none',
                }}
            />
        </>
    )
}
