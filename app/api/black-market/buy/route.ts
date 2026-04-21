import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { PACKS } from '@/lib/packs'

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { itemId } = await req.json()
    if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })

    // Fetch item
    const { data: item } = await admin
        .from('black_market_items')
        .select('id, pack_id, discount_pct, quantity_remaining, market_id')
        .eq('id', itemId)
        .single()
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    if (item.quantity_remaining <= 0) return NextResponse.json({ error: 'Out of stock' }, { status: 409 })

    // Verify market still active
    const now = new Date().toISOString()
    const { data: market } = await admin
        .from('black_market')
        .select('active_until')
        .eq('id', item.market_id)
        .single()
    if (!market || market.active_until < now) {
        return NextResponse.json({ error: 'Market has closed' }, { status: 410 })
    }

    // Level + coin check
    const pack = PACKS.find(p => p.id === item.pack_id)
    if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('level, coins')
        .eq('id', user.id)
        .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const levelReq = pack.level_required ?? 1
    if (Number(profile.level) < levelReq) {
        return NextResponse.json({ error: `Level ${levelReq} required` }, { status: 403 })
    }

    const cost = parseFloat((pack.cost * (1 - Number(item.discount_pct))).toFixed(2))
    const coins = Number(profile.coins)
    if (coins < cost) return NextResponse.json({ error: 'Insufficient coins' }, { status: 402 })

    // Atomic decrement with optimistic lock
    const { error: decrErr } = await admin
        .from('black_market_items')
        .update({ quantity_remaining: item.quantity_remaining - 1 })
        .eq('id', itemId)
        .eq('quantity_remaining', item.quantity_remaining)  // stale-read guard
    if (decrErr) return NextResponse.json({ error: 'Out of stock' }, { status: 409 })

    // Deduct coins + add to pending_packs
    await Promise.all([
        supabase.from('profiles').update({ coins: coins - cost }).eq('id', user.id),
        supabase.from('pending_packs').insert({ user_id: user.id, pack_id: item.pack_id, source: 'black_market' }),
    ])

    return NextResponse.json({ success: true, coinsSpent: cost })
}
