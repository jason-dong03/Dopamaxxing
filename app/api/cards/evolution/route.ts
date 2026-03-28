// GET /api/cards/evolution?name=Pikachu
// Returns evolution candidates (cards where evolves_from matches the given base name).

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const name = request.nextUrl.searchParams.get('name')
    if (!name) return NextResponse.json({ cards: [] })

    const supabase = await createClient()
    const { data } = await supabase
        .from('cards')
        .select('id, name, image_url, image_url_hi, rarity')
        .ilike('evolves_from', name)
        .limit(20)

    return NextResponse.json({ cards: data ?? [] })
}
