import { applyXP, RARITY_XP } from '@/lib/rarityConfig'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { cardID } = await request.json()

        const { data: userCard } = await supabase
            .from('user_cards')
            .select('*, cards(rarity)')
            .eq('user_id', user.id)
            .eq('card_id', cardID)
            .single()

        const rarity = userCard.cards.rarity
        const { newLevel, newXP } = applyXP(
            userCard.card_level,
            userCard.card_xp,
            RARITY_XP[rarity],
            rarity,
        )
        const levelsGained = newLevel - userCard.card_level

        // update card XP + increment cards_fed stat (non-blocking, fails gracefully)
        await supabase
            .from('user_cards')
            .update({ card_level: newLevel, card_xp: newXP })
            .eq('user_id', user.id)
            .eq('card_id', cardID)

        supabase
            .from('profiles')
            .select('cards_fed')
            .eq('id', user.id)
            .single()
            .then(({ data }) =>
                supabase
                    .from('profiles')
                    .update({ cards_fed: (data?.cards_fed ?? 0) + 1 })
                    .eq('id', user.id),
            )
            .catch(() => {})

        return NextResponse.json({ newLevel, newXP, levelsGained })
    } catch (error) {
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
