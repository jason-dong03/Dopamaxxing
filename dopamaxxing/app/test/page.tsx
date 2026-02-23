'use client'

import FlipCard from '@/components/FlipCard'

export default function TestPage() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <FlipCard
                card={{
                    id: 'sv10.5b-034',
                    name: 'Zekrom ex',
                    image_url:
                        'https://assets.tcgdex.net/en/sv/sv10.5b/172/low.webp',
                    rarity: '???',
                }}
                onReveal={() => console.log('card revealed!')}
            />
        </div>
    )
}
