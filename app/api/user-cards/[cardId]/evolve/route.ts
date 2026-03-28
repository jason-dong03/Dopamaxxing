// POST /api/user-cards/[cardId]/evolve
// Evolves a user's card into a target evolution card.
// Body: { targetCardId: string, transferLevels: boolean }
// Deletes the original card, creates a new one.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> },
) {
    const { cardId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { targetCardId, transferLevels } = await request.json()
    if (!targetCardId) return NextResponse.json({ error: 'Missing targetCardId' }, { status: 400 })

    // Verify ownership and get original card stats
    const { data: original } = await supabase
        .from('user_cards')
        .select('id, card_level, card_xp, stat_atk, stat_def, stat_spatk, stat_spdef, stat_spd, stat_accuracy, stat_evasion, nature, moves, worth')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single()

    if (!original) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    // Verify the target card exists
    const { data: targetCard } = await supabase
        .from('cards')
        .select('id, market_price_usd')
        .eq('id', targetCardId)
        .single()

    if (!targetCard) return NextResponse.json({ error: 'Target card not found' }, { status: 404 })

    // Build new user card data
    const newCard: Record<string, unknown> = {
        user_id: user.id,
        card_id: targetCardId,
        worth: Number(targetCard.market_price_usd ?? 1),
    }

    if (transferLevels) {
        newCard.card_level = original.card_level
        newCard.card_xp = original.card_xp
        newCard.stat_atk = original.stat_atk
        newCard.stat_def = original.stat_def
        newCard.stat_spatk = original.stat_spatk
        newCard.stat_spdef = original.stat_spdef
        newCard.stat_spd = original.stat_spd
        newCard.stat_accuracy = original.stat_accuracy
        newCard.stat_evasion = original.stat_evasion
        newCard.nature = original.nature
        newCard.moves = original.moves
    }

    // Insert new card and delete old card atomically (best effort)
    const { data: inserted, error: insertError } = await supabase
        .from('user_cards')
        .insert(newCard)
        .select('id')
        .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    await supabase.from('user_cards').delete().eq('id', cardId).eq('user_id', user.id)

    return NextResponse.json({ newCardId: inserted.id })
}
