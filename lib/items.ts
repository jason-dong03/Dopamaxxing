export type ItemId = 'full-heal' | 'potion' | 'super-potion' | 'revive' | 'n-crown'

export type ItemDef = {
    id: ItemId
    name: string
    description: string
    icon: string          // emoji or '/path' to image asset
    shopCost: number      // coins
    inBattle: boolean     // usable during battle
    category: 'battle' | 'misc'
}

export const ITEMS: ItemDef[] = [
    {
        id:          'full-heal',
        name:        'Full Heal',
        description: 'Cures all status conditions (burn, poison, sleep, paralysis, confusion).',
        icon:        '/assets/full-heal.png',
        shopCost:    300,
        inBattle:    true,
        category:    'battle',
    },
    {
        id:          'potion',
        name:        'Potion',
        description: 'Restores 20 HP to one Pokémon.',
        icon:        '/assets/potion.jpeg',
        shopCost:    200,
        inBattle:    true,
        category:    'battle',
    },
    {
        id:          'super-potion',
        name:        'Super Potion',
        description: 'Restores 50 HP to one Pokémon.',
        icon:        '/assets/super-potion.png',
        shopCost:    500,
        inBattle:    true,
        category:    'battle',
    },
    {
        id:          'revive',
        name:        'Revive',
        description: 'Revives a fainted Pokémon with half its HP.',
        icon:        '/assets/revive.png',
        shopCost:    1500,
        inBattle:    true,
        category:    'battle',
    },
    {
        id:          'n-crown',
        name:        "N's Crown",
        description: 'The crown worn by N. It radiates a quiet, haunting warmth. Inspect it to unlock a hidden memory.',
        icon:        '/assets/n-crown.png',
        shopCost:    0,
        inBattle:    false,
        category:    'misc',
    },
]

export const ITEM_MAP = Object.fromEntries(ITEMS.map(i => [i.id, i])) as Record<ItemId, ItemDef>
