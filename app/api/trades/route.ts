import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/trades — all pending trades for the current user
export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
        .from('trades')
        .select(`
            id, status, want_note, created_at, updated_at,
            proposer:profiles!trades_proposer_id_fkey(id, username, profile_url),
            receiver:profiles!trades_receiver_id_fkey(id, username, profile_url),
            trade_items(id, user_card_id, user_cards(id, card_id, cards(id, name, image_url, rarity)))
        `)
        .or(`proposer_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    return NextResponse.json({ trades: data ?? [] })
}

// POST /api/trades — propose a trade
// body: { receiverId, cardIds: string[], wantNote? }
export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { receiverId, cardIds, wantNote } = await req.json()
    if (!receiverId || !Array.isArray(cardIds) || cardIds.length === 0) {
        return NextResponse.json({ error: 'receiverId and cardIds required' }, { status: 400 })
    }
    if (receiverId === user.id) {
        return NextResponse.json({ error: 'Cannot trade with yourself' }, { status: 400 })
    }
    if (cardIds.length > 5) {
        return NextResponse.json({ error: 'Max 5 cards per trade' }, { status: 400 })
    }

    // Verify all cards belong to the proposer
    const { data: ownedCards } = await supabase
        .from('user_cards')
        .select('id')
        .eq('user_id', user.id)
        .in('id', cardIds)
    if (!ownedCards || ownedCards.length !== cardIds.length) {
        return NextResponse.json({ error: 'Some cards not owned' }, { status: 403 })
    }

    const { data: trade, error } = await supabase
        .from('trades')
        .insert({ proposer_id: user.id, receiver_id: receiverId, want_note: wantNote ?? null })
        .select('id')
        .single()
    if (error || !trade) return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 })

    await supabase.from('trade_items').insert(
        cardIds.map((id: string) => ({ trade_id: trade.id, user_card_id: id })),
    )

    return NextResponse.json({ tradeId: trade.id })
}
