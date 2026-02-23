import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const WEIGHTS: Record<string, number> = {
    Common: 60,
    Uncommon: 25,
    Rare: 10,
    Epic: 3,
    Mythical: 1.5,
    Legendary: 0.4,
    Divine: 0.1,
    Celestial: 0.05,
    '???': 0.01,
}

const pityRarities = ['Legendary', 'Divine', 'Celestial', '???']

function pickRarity(): string {
    var totalWeights = Object.values(WEIGHTS).reduce(
        (accumulator, curr) => accumulator + curr,
        0,
    )
    let roll = Math.random() * totalWeights

    for (const [rarity, weight] of Object.entries(WEIGHTS)) {
        roll -= weight
        if (roll <= 0) return rarity
    }

    return 'Common'
}
export async function POST() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data: profile } = await supabase
            .from('profiles')
            .select('pity_counter, pity_threshold')
            .eq('id', user?.id)
            .single()

        const pickedCards = []
        for (let i = 0; i < 5; i++) {
            var cardRarity = pickRarity()
            const { data: cards, error } = await supabase
                .from('cards')
                .select('*')
                .eq('rarity', cardRarity)
            if (error || !cards || cards.length === 0) continue

            const selectedRandomCard =
                cards[Math.floor(Math.random() * cards.length)]
            pickedCards.push(selectedRandomCard)
        }

        const hitHighRarity = pickedCards.some((c) =>
            pityRarities.includes(c.rarity),
        )
        const newPityCounter = hitHighRarity
            ? 0
            : (profile?.pity_counter ?? 0) + 1

        await supabase
            .from('profiles')
            .update({ pity_counter: newPityCounter })
            .eq('id', user?.id)

        const cardIds = pickedCards.map((c) => c.id)

        const { data: owned } = await supabase
            .from('user_cards')
            .select('card_id')
            .eq('user_id', user.id)
            .in('card_id', cardIds)

        const ownedIds = new Set(owned?.map((o) => o.card_id) ?? [])

        const cardsWithMeta = pickedCards.map((card) => ({
            ...card,
            isNew: !ownedIds.has(card.id),
        }))

        return NextResponse.json({ cards: cardsWithMeta })
    } catch (err) {
        console.error(err)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
