// POST /api/admin/backfill-pending-moves
// For user_cards with card_level > 1 and no pending_moves,
// computes moves learnable up to their level that aren't in their active moveset
// and populates pending_moves so users can make move selections they missed.
// Processes in batches of 10. Returns { updated, skipped, remaining, errors }.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { fetchPokemonData } from '@/lib/pokemon-moves'
import { MOVE_EXTRAS } from '@/lib/pokemon-status-moves'
import type { StoredMove } from '@/lib/pokemon-moves'

const BATCH_SIZE = 10

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

    // Find user_cards: leveled up, no pending moves, has a dex number
    const { data: cards, error } = await admin
        .from('user_cards')
        .select('id, card_level, moves, cards!inner(national_pokedex_number)')
        .gt('card_level', 1)
        .is('pending_moves', null)
        .not('cards.national_pokedex_number', 'is', null)
        .limit(BATCH_SIZE)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!cards?.length) return NextResponse.json({ updated: 0, skipped: 0, remaining: 'Done.' })

    const errors: string[] = []
    let updated = 0
    let skipped = 0

    // Cache PokeAPI results by dex number to avoid redundant calls
    const pokeCache = new Map<number, Awaited<ReturnType<typeof fetchPokemonData>>>()

    for (const card of cards) {
        const dex: number = (card as any).cards?.national_pokedex_number
        const level: number = (card as any).card_level ?? 1
        const activeMoves: StoredMove[] = ((card as any).moves as StoredMove[] | null) ?? []

        if (!dex) { skipped++; continue }

        try {
            // Fetch from PokeAPI (cached per dex)
            if (!pokeCache.has(dex)) {
                pokeCache.set(dex, await fetchPokemonData(dex))
            }
            const pokeData = pokeCache.get(dex)
            if (!pokeData?.levelMoves?.length) { skipped++; continue }

            // All moves learnable at or below this card's level
            const learnable = pokeData.levelMoves.filter(m => m.learnedAt <= Math.max(level, 1))
            if (!learnable.length) { skipped++; continue }

            // Filter out moves already in the active moveset
            const activeNames = new Set(activeMoves.map(m => m.name))
            const candidates = learnable.filter(m => !activeNames.has(m.name))
            if (!candidates.length) { skipped++; continue }

            // Look up candidate moves in the DB
            const identifiers = candidates.map(m => m.name)
            const { data: dbMoves } = await admin
                .from('moves')
                .select('*')
                .in('identifier', identifiers)
                .not('seeded_at', 'is', null)

            if (!dbMoves?.length) { skipped++; continue }

            const dbMap = new Map((dbMoves ?? []).map((d: any) => [d.identifier, d]))

            const pendingMoves: StoredMove[] = candidates
                .map(lm => {
                    const db = dbMap.get(lm.name)
                    if (!db) return null
                    const extras = (MOVE_EXTRAS as any)[db.identifier] ?? {}
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
                        ...(extras.healFraction !== undefined ? { healFraction: extras.healFraction } : db.heal_fraction != null ? { healFraction: db.heal_fraction } : {}),
                        ...(extras.statusInflict ? { statusInflict: extras.statusInflict } : db.status_inflict ? { statusInflict: db.status_inflict } : {}),
                        ...(extras.alwaysInflict !== undefined ? { alwaysInflict: extras.alwaysInflict } : db.always_inflict != null ? { alwaysInflict: db.always_inflict } : {}),
                        ...(extras.selfStatusInflict ? { selfStatusInflict: extras.selfStatusInflict } : db.self_status_inflict ? { selfStatusInflict: db.self_status_inflict } : {}),
                        ...(extras.selfDamage !== undefined ? { selfDamage: extras.selfDamage } : db.self_damage != null ? { selfDamage: db.self_damage } : {}),
                        ...(extras.selfBoosts?.length ? { selfBoosts: extras.selfBoosts } : db.self_boosts?.length ? { selfBoosts: db.self_boosts } : {}),
                        ...(extras.enemyDrops?.length ? { enemyDrops: extras.enemyDrops } : db.enemy_drops?.length ? { enemyDrops: db.enemy_drops } : {}),
                        ...(extras.priority !== undefined ? { priority: extras.priority } : db.priority !== 0 ? { priority: db.priority } : {}),
                    } as StoredMove
                })
                .filter(Boolean) as StoredMove[]

            if (!pendingMoves.length) { skipped++; continue }

            // Keep the most recently learnable ones, cap at 12 (same as add-to-bag)
            const toSet = pendingMoves.slice(-12)

            const { error: updateErr } = await admin
                .from('user_cards')
                .update({ pending_moves: toSet })
                .eq('id', card.id)

            if (updateErr) {
                errors.push(`${card.id}: ${updateErr.message}`)
            } else {
                updated++
            }
        } catch (e: any) {
            errors.push(`${card.id}: ${e?.message ?? 'unknown error'}`)
        }
    }

    // Count remaining eligible cards
    const { count } = await admin
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .gt('card_level', 1)
        .is('pending_moves', null)
        .not('cards.national_pokedex_number', 'is', null)

    return NextResponse.json({
        updated,
        skipped,
        remaining: count ? `${count} cards remaining` : 'Done.',
        errors,
    })
}
