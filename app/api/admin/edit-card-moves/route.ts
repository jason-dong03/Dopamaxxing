// GET  /api/admin/edit-card-moves?userCardId=X  — fetch moves for a card
// POST /api/admin/edit-card-moves                — update moves for a card
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return null
    return admin
}

export async function GET(request: NextRequest) {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const userCardId = request.nextUrl.searchParams.get('userCardId')
    if (!userCardId) return NextResponse.json({ error: 'userCardId required' }, { status: 400 })

    const { data, error } = await admin
        .from('user_cards')
        .select('id, moves, card_level, cards!inner(name, rarity, national_pokedex_number)')
        .eq('id', userCardId)
        .single()

    if (error || !data) return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    return NextResponse.json({ card: data })
}

export async function POST(request: NextRequest) {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { userCardId, moves } = await request.json() as { userCardId: string; moves: unknown[] }
    if (!userCardId || !Array.isArray(moves)) {
        return NextResponse.json({ error: 'userCardId and moves array required' }, { status: 400 })
    }

    const { error } = await admin.from('user_cards').update({ moves }).eq('id', userCardId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
