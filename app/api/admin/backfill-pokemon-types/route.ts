// POST /api/admin/backfill-pokemon-types
// Fetches primary pokemon_type from PokeAPI for cards where pokemon_type IS NULL.
// Processes in batches of 15. Returns { updated, remaining, errors }.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BATCH_SIZE = 15
const POKEAPI = 'https://pokeapi.co/api/v2'

async function fetchType(dexNumber: number): Promise<string | null> {
    try {
        const res = await fetch(`${POKEAPI}/pokemon/${dexNumber}`, {
            next: { revalidate: 86400 },
            signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return null
        const data = await res.json()
        const rawTypes = (data.types ?? []) as Array<{ slot: number; type: { name: string } }>
        return rawTypes.find(t => t.slot === 1)?.type.name ?? null
    } catch {
        return null
    }
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // Fetch cards missing pokemon_type (with a valid dex number)
    const { data: cards, error } = await admin
        .from('cards')
        .select('id, national_pokedex_number')
        .is('pokemon_type', null)
        .not('national_pokedex_number', 'is', null)
        .limit(BATCH_SIZE)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!cards?.length) return NextResponse.json({ updated: 0, remaining: 'Done.' })

    const errors: string[] = []
    let updated = 0

    for (const card of cards) {
        const type = await fetchType(card.national_pokedex_number)
        if (!type) {
            errors.push(`#${card.national_pokedex_number} — no type found`)
            continue
        }
        const { error: updateErr } = await admin
            .from('cards')
            .update({ pokemon_type: type })
            .eq('id', card.id)
        if (updateErr) {
            errors.push(`${card.id}: ${updateErr.message}`)
        } else {
            updated++
        }
    }

    // Count remaining
    const { count } = await admin
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .is('pokemon_type', null)
        .not('national_pokedex_number', 'is', null)

    return NextResponse.json({
        updated,
        remaining: count ? `${count} cards remaining` : 'Done.',
        errors,
    })
}
