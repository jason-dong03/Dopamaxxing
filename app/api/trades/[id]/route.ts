import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/trades/[id] — body: { action: 'accept' | 'decline' | 'cancel' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { action } = await req.json()
    if (!['accept', 'decline', 'cancel'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: trade } = await supabase
        .from('trades')
        .select('id, status, proposer_id, receiver_id')
        .eq('id', id)
        .single()
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    if (trade.status !== 'pending') return NextResponse.json({ error: 'Trade already resolved' }, { status: 409 })

    if (action === 'cancel' && trade.proposer_id !== user.id) {
        return NextResponse.json({ error: 'Only proposer can cancel' }, { status: 403 })
    }
    if ((action === 'accept' || action === 'decline') && trade.receiver_id !== user.id) {
        return NextResponse.json({ error: 'Only receiver can accept or decline' }, { status: 403 })
    }

    if (action === 'accept') {
        // Fetch cards being offered
        const { data: items } = await supabase
            .from('trade_items')
            .select('user_card_id')
            .eq('trade_id', id)
        if (!items?.length) return NextResponse.json({ error: 'No items in trade' }, { status: 400 })

        const cardIds = items.map(i => i.user_card_id)

        // Verify proposer still owns the cards
        const { data: owned } = await supabase
            .from('user_cards')
            .select('id')
            .eq('user_id', trade.proposer_id)
            .in('id', cardIds)
        if (!owned || owned.length !== cardIds.length) {
            await supabase.from('trades').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
            return NextResponse.json({ error: 'Proposer no longer owns offered cards' }, { status: 409 })
        }

        // Transfer cards to receiver
        await supabase
            .from('user_cards')
            .update({ user_id: trade.receiver_id })
            .in('id', cardIds)

        // Mark trade accepted
        await supabase.from('trades').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id)

        // Increment trades_completed for both parties + mark N's quest flag (fire and forget)
        Promise.all([
            supabase.rpc('increment_trades_completed', { uid: trade.proposer_id }),
            supabase.rpc('increment_trades_completed', { uid: trade.receiver_id }),
            supabase.from('n_quest_progress')
                .upsert({ user_id: trade.proposer_id, trade_completed: true }, { onConflict: 'user_id' }),
            supabase.from('n_quest_progress')
                .upsert({ user_id: trade.receiver_id, trade_completed: true }, { onConflict: 'user_id' }),
        ]).catch(() => {})

        return NextResponse.json({ success: true, action: 'accepted', cardIds })
    }

    // decline or cancel
    const newStatus = action === 'decline' ? 'declined' : 'cancelled'
    await supabase.from('trades').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ success: true, action: newStatus })
}
