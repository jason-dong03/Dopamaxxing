export type Pack = {
    id: string // maps to set_id in cards table
    name: string
    image: string // path to pack image
    description: string
    aspect: 'pack' | 'box'
    cost: number // coins required to open
}

export const PACKS: Pack[] = [
    {
        id: 'sv10.5b',
        name: 'Black Bolt',
        image: '/packs/black-bolt.jpg',
        description: 'Scarlet & Violet — Black Bolt',
        aspect: 'pack',
        cost: 100,
    },
    {
        id: 'sv10.5w',
        name: 'White Flare',
        image: '/packs/white-flare.jpg',
        description: 'Scarlet & Violet — White Flare',
        aspect: 'pack',
        cost: 100,
    },
    {
        id: 'xy-p-poncho',
        name: 'Poncho Pikachu',
        image: '/packs/pikachu-poncho.png',
        description: 'XY Promo — Poncho Pikachu',
        aspect: 'box',
        cost: 400,
    },
]
