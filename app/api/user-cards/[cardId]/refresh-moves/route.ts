// POST /api/user-cards/[cardId]/refresh-moves
// Updates a user card's moveset using the moves DB table + PokeAPI level-up list.
// Respects the card's current level — only moves learnable at that level are eligible.
// Returns { moves, pool } where pool is all available moves at this level (may be > 4).

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fetchPokemonData } from '@/lib/pokemon-moves'
import { MOVE_EXTRAS } from '@/lib/pokemon-status-moves'
import type { StoredMove } from '@/lib/pokemon-moves'

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> },
) {
    const { cardId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: uc } = await supabase
        .from('user_cards')
        .select('id, card_level, cards!inner(national_pokedex_number)')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single()

    if (!uc) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const dex: number = (uc as any).cards?.national_pokedex_number
    const level: number = (uc as any).card_level ?? 1

    if (!dex) return NextResponse.json({ error: 'No dex number' }, { status: 400 })

    // Fetch level-up move list from PokeAPI
    const pokeData = await fetchPokemonData(dex)
    if (!pokeData?.levelMoves?.length) return NextResponse.json({ error: 'No moves found for this pokemon' }, { status: 404 })

    // All moves learnable at this level, sorted by learnedAt desc (most recent first)
    const available = pokeData.levelMoves
        .filter(m => m.learnedAt <= Math.max(level, 1))
        .sort((a, b) => b.learnedAt - a.learnedAt)

    if (!available.length) return NextResponse.json({ error: 'No level-gated moves available' }, { status: 404 })

    // Look up all available moves in the DB table at once
    const identifiers = available.map(m => m.name)
    const { data: dbMoves } = await supabase
        .from('moves')
        .select('*')
        .in('identifier', identifiers)

    const dbMap = new Map((dbMoves ?? []).map((d: any) => [d.identifier, d]))

    function buildStoredMove(lm: { name: string; learnedAt: number }): StoredMove | null {
        const db = dbMap.get(lm.name)
        if (!db) return null
        const extras = MOVE_EXTRAS[db.identifier] as any ?? {}
        return {
            name: db.identifier,
            displayName: db.display_name,
            learnedAt: lm.learnedAt,
            pp: db.pp,
            power: db.power,
            accuracy: db.accuracy,
            type: db.type,
            damageClass: db.damage_class,
            effect: db.effect ?? '',
            // MOVE_EXTRAS overrides DB Groq data
            ...(extras.healFraction !== undefined ? { healFraction: extras.healFraction } : db.heal_fraction != null ? { healFraction: db.heal_fraction } : {}),
            ...(extras.statusInflict ? { statusInflict: extras.statusInflict } : db.status_inflict ? { statusInflict: db.status_inflict } : {}),
            ...(extras.alwaysInflict !== undefined ? { alwaysInflict: extras.alwaysInflict } : db.always_inflict != null ? { alwaysInflict: db.always_inflict } : {}),
            ...(extras.selfStatusInflict ? { selfStatusInflict: extras.selfStatusInflict } : db.self_status_inflict ? { selfStatusInflict: db.self_status_inflict } : {}),
            ...(extras.selfDamage !== undefined ? { selfDamage: extras.selfDamage } : db.self_damage != null ? { selfDamage: db.self_damage } : {}),
            ...(extras.selfBoosts?.length ? { selfBoosts: extras.selfBoosts } : db.self_boosts?.length ? { selfBoosts: db.self_boosts } : {}),
            ...(extras.enemyDrops?.length ? { enemyDrops: extras.enemyDrops } : db.enemy_drops?.length ? { enemyDrops: db.enemy_drops } : {}),
            ...(extras.priority !== undefined ? { priority: extras.priority } : db.priority !== 0 ? { priority: db.priority } : {}),
        } as StoredMove
    }

    // Pool = all available moves with DB data (for user to choose from if > 4)
    const pool: StoredMove[] = available
        .map(buildStoredMove)
        .filter(Boolean) as StoredMove[]

    // Default selection: last 4 learnable (most recently learned)
    const selected = pool.slice(0, 4)

    if (!selected.length) return NextResponse.json({ error: 'No moves found in DB — run seed first' }, { status: 404 })

    const { error } = await supabase
        .from('user_cards')
        .update({ moves: selected })
        .eq('id', cardId)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
        moves: selected,
        pool,
        poolSize: pool.length,
        hasChoice: pool.length > 4,
    })
}
