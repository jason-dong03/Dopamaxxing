// GET  /api/battle-lineup  — returns all saved lineups with card details
// POST /api/battle-lineup  — create a new lineup { name?, slots: string[] }
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function hydrateLineup(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, cardIds: string[]) {
    if (!cardIds.length) return []
    const { data: rows } = await supabase
        .from('user_cards')
        .select('id, card_level, cards!inner(id, name, image_url, rarity)')
        .in('id', cardIds)
        .eq('user_id', userId)
    const cardMap = Object.fromEntries((rows ?? []).map((r: any) => [r.id, r]))
    return cardIds.map(id => cardMap[id]).filter(Boolean)
}

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: lineups, error } = await supabase
        .from('battle_lineups')
        .select('id, name, slots, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Hydrate each lineup with card details
    const hydrated = await Promise.all(
        (lineups ?? []).map(async (l: any) => ({
            id: l.id,
            name: l.name,
            slots: l.slots,
            cards: await hydrateLineup(supabase, user.id, l.slots ?? []),
        }))
    )

    return NextResponse.json({ lineups: hydrated })
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { name?: string; slots: string[] }
    const { name = 'My Lineup', slots } = body

    if (!Array.isArray(slots) || slots.length < 1 || slots.length > 5) {
        return NextResponse.json({ error: 'Lineup must be 1–5 cards' }, { status: 400 })
    }

    // Verify ownership
    const { data: owned } = await supabase
        .from('user_cards')
        .select('id')
        .eq('user_id', user.id)
        .in('id', slots)

    if (!owned || owned.length !== slots.length) {
        return NextResponse.json({ error: 'Invalid card selection' }, { status: 400 })
    }

    const { data: created, error } = await supabase
        .from('battle_lineups')
        .insert({ user_id: user.id, name, slots })
        .select('id, name, slots, created_at')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const cards = await hydrateLineup(supabase, user.id, (created as any).slots)
    return NextResponse.json({ lineup: { ...(created as any), cards } })
}
