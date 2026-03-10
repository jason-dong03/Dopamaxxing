export type Pack = {
    id: string // maps to set_id in cards table
    name: string
    image: string // path to pack image
    description: string
    aspect: 'pack' | 'box'
}

export const PACKS: Pack[] = [
    {
        id: 'sv10.5b',
        name: 'Black Bolt',
        image: '/packs/black-bolt.jpg',
        description: 'Scarlet & Violet — Black Bolt',
        aspect: 'pack',
    },
    {
        id: 'sv10.5w',
        name: 'White Flare',
        image: '/packs/white-flare.jpg',
        description: 'Scarlet & Violet — White Flare',
        aspect: 'pack',
    },
    {
        id: 'xy-p-poncho',
        name: 'Poncho Pikachu',
        image: '/packs/pikachu-poncho.png', // add your image
        description: 'XY Promo — Poncho Pikachu',
        aspect: 'box',
    },
]
