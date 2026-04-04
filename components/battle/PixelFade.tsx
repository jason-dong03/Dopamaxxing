'use client'

type Props = {
    direction: 'in' | 'out'
    onComplete?: () => void
}

export function PixelFade({ direction, onComplete }: Props) {
    const animation = direction === 'in'
        ? 'pixel-fade-in 500ms steps(8, end) forwards'
        : 'pixel-fade-out 500ms steps(8, end) forwards'

    return (
        <>
            <style>{`
                @keyframes pixel-fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes pixel-fade-out {
                    from { opacity: 1; }
                    to   { opacity: 0; }
                }
            `}</style>
            <div
                onAnimationEnd={onComplete}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: '#000',
                    animation,
                    pointerEvents: 'none',
                }}
            />
        </>
    )
}
