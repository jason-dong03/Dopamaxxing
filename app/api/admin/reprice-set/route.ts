import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateBuyback } from '@/lib/rarityConfig'
import type { Attrs } from '@/lib/rarityConfig'

// GET /api/admin/reprice-set — returns distinct set_ids with card counts
export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // Get distinct set_ids with counts from cards
    const { data: rows } = await admin
        .from('cards')
        .select('set_id')
        .not('set_id', 'is', null)

    if (!rows) return NextResponse.json({ sets: [] })

    const counts: Record<string, number> = {}
    for (const r of rows) {
        if (r.set_id) counts[r.set_id] = (counts[r.set_id] ?? 0) + 1
    }

    const sets = Object.entries(counts)
        .map(([id, cardCount]) => ({ id, cardCount }))
        .sort((a, b) => a.id.localeCompare(b.id))

    return NextResponse.json({ sets })
}

// POST /api/admin/reprice-set { setId, exclude1stEd? }
// Recalculates worth on all user_cards for the given set (50 per run, paginated)
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()
    const { setId, offset = 0 } = await request.json() as { setId: string; offset?: number }

    if (!setId) return NextResponse.json({ error: 'setId required' }, { status: 400 })

    // Fetch user_cards joined to cards in this set, paginated 50 at a time
    const BATCH = 50
    const { data: ucRows } = await admin
        .from('user_cards')
        .select('id, worth, is_hot, attr_centering, attr_corners, attr_edges, attr_surface, cards!inner(rarity, set_id)')
        .eq('cards.set_id', setId)
        .range(offset, offset + BATCH - 1)

    if (!ucRows || ucRows.length === 0) {
        return NextResponse.json({ updated: 0, nextOffset: null, message: 'Done.' })
    }

    const updates: { id: string; worth: number; is_hot: boolean }[] = []

    for (const uc of ucRows) {
        const card = uc.cards as any
        const rarity = card?.rarity ?? 'Common'
        const attrs: Attrs | null = (uc.attr_centering != null)
            ? {
                attr_centering: Number(uc.attr_centering),
                attr_corners:   Number(uc.attr_corners),
                attr_edges:     Number(uc.attr_edges),
                attr_surface:   Number(uc.attr_surface),
            }
            : null
        const { coins, isHot } = calculateBuyback(rarity, 0, attrs, false)
        updates.push({ id: uc.id, worth: coins, is_hot: isHot })
    }

    const { error } = await admin
        .from('user_cards')
        .upsert(updates, { onConflict: 'id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const nextOffset = ucRows.length < BATCH ? null : offset + BATCH
    return NextResponse.json({ updated: updates.length, nextOffset, message: nextOffset ? `Updated ${updates.length}. Continue from offset ${nextOffset}.` : 'Done.' })
}
