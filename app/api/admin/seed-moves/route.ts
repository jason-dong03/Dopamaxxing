// POST /api/admin/seed-moves
// Seeds the `moves` table from the PDF-sourced SEED_MOVES list.
// Phase 1 (mode=insert):  Upserts all 460 moves with basic data (no PokeAPI/Groq yet).
// Phase 2 (mode=enrich):  Fetches effect text from PokeAPI + classifies via Groq.
//                         Processes BATCH_SIZE moves per call. Run repeatedly until done.
// Phase 3 (mode=backfill): Updates user_cards.moves using the enriched moves table.
//                          Processes 25 cards per call. Run repeatedly until done.

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SEED_MOVES } from '@/lib/moves-seed-data'
import { MOVE_EXTRAS } from '@/lib/pokemon-status-moves'
import { fetchPokemonData } from '@/lib/pokemon-moves'
import type { StoredMove } from '@/lib/pokemon-moves'

const BATCH_SIZE = 20

async function fetchPokeEffect(identifier: string): Promise<string> {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/move/${identifier}/`, {
            next: { revalidate: 86400 },
        })
        if (!res.ok) return ''
        const d = await res.json()
        const entry = d.effect_entries?.find((e: any) => e.language?.name === 'en')
        return ((entry?.short_effect ?? '').slice(0, 120) as string)
    } catch {
        return ''
    }
}

async function classifyExtras(identifier: string, effect: string, power: number | null, damageClass: string) {
    try {
        const { default: Groq } = await import('groq-sdk')
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const prompt = `You are a Pokemon game mechanics expert. Given a Pokemon move, extract its battle extras as JSON.

Move: ${identifier}
Effect: ${effect}
Power: ${power ?? 'none'}
Damage class: ${damageClass}

Return ONLY a JSON object with these optional fields (omit fields that don't apply):
- healFraction: number (fraction of max HP restored, e.g. 0.5 for Recover, 0.25 for Aqua Ring)
- statusInflict: string (one of: "burn", "poison", "paralysis", "sleep", "confusion")
- alwaysInflict: boolean (true if status always inflicts, false if chance-based)
- selfStatusInflict: string (one of the status strings above, if the move inflicts on the user)
- selfDamage: number (recoil as fraction of max HP, e.g. 0.25 for recoil moves)
- selfBoosts: array of {stat, stages} where stat is "attack"|"defense"|"speed" and stages is +1 to +3
- enemyDrops: array of {stat, stages} where stat is "attack"|"defense"|"speed" and stages is -1 to -3
Return {} if the move has no special battle extras beyond damage. Return ONLY valid JSON.`

        const chat = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 150,
        })
        const raw = chat.choices[0]?.message?.content?.trim() ?? '{}'
        return JSON.parse(raw)
    } catch {
        return {}
    }
}

function displayName(identifier: string): string {
    return identifier.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function authAdmin(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return null
    return admin
}

export async function POST(request: NextRequest) {
    const admin = await authAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as {
        mode?: 'insert' | 'enrich' | 'backfill'
        offset?: number
    }
    const mode = body.mode ?? 'insert'
    const offset = body.offset ?? 0

    // ── Phase 1: Insert all moves with basic data ─────────────────────────────
    if (mode === 'insert') {
        const rows = SEED_MOVES.map(m => ({
            id: m.id,
            identifier: m.identifier,
            display_name: displayName(m.identifier),
            generation_id: m.generation_id,
            type: m.type,
            power: m.power,
            pp: m.pp,
            accuracy: m.accuracy,
            priority: m.priority,
            damage_class: m.damage_class,
            effect_id: m.effect_id,
            effect_chance: m.effect_chance,
            is_attack: m.is_attack,
            is_buff: m.is_buff,
            is_heal: m.is_heal,
            is_enemy_debuff: m.is_enemy_debuff,
        }))

        // Also apply MOVE_EXTRAS data that we already know
        const enrichedRows = rows.map(r => {
            const extras = MOVE_EXTRAS[r.identifier] as any
            if (!extras) return r
            return {
                ...r,
                heal_fraction: extras.healFraction ?? null,
                status_inflict: extras.statusInflict ?? null,
                always_inflict: extras.alwaysInflict ?? null,
                self_status_inflict: extras.selfStatusInflict ?? null,
                self_damage: extras.selfDamage ?? null,
                self_boosts: extras.selfBoosts ? JSON.stringify(extras.selfBoosts) : null,
                enemy_drops: extras.enemyDrops ? JSON.stringify(extras.enemyDrops) : null,
                // priority from MOVE_EXTRAS overrides PDF
                priority: extras.priority ?? r.priority,
            }
        })

        const { error } = await admin
            .from('moves')
            .upsert(enrichedRows, { onConflict: 'id' })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ inserted: enrichedRows.length, message: 'All moves inserted. Now run mode=enrich to fetch effect text + Groq classification.' })
    }

    // ── Phase 2: Enrich — fetch PokeAPI effect + Groq for buff/heal/debuff ────
    if (mode === 'enrich') {
        const { data: rows, error: fetchErr } = await admin
            .from('moves')
            .select('id, identifier, power, damage_class, is_buff, is_heal, is_enemy_debuff, heal_fraction, self_boosts, enemy_drops, status_inflict')
            .is('seeded_at', null)
            .order('id')
            .range(offset, offset + BATCH_SIZE - 1)

        if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
        if (!rows?.length) return NextResponse.json({ seeded: 0, remaining: 'Done.' })

        let seeded = 0
        const errors: string[] = []

        await Promise.allSettled((rows as any[]).map(async (row) => {
            try {
                const effect = await fetchPokeEffect(row.identifier)

                // Determine if we need Groq (is_buff/is_heal/is_enemy_debuff and not already from MOVE_EXTRAS)
                const needsGroq = (row.is_buff || row.is_heal || row.is_enemy_debuff)
                    && row.heal_fraction == null
                    && row.self_boosts == null
                    && row.enemy_drops == null
                    && row.status_inflict == null
                    && !MOVE_EXTRAS[row.identifier]

                let extras: any = {}
                if (needsGroq) {
                    extras = await classifyExtras(row.identifier, effect, row.power, row.damage_class)
                }

                const patch: Record<string, any> = {
                    effect: effect || null,
                    seeded_at: new Date().toISOString(),
                }
                if (extras.healFraction !== undefined)     patch.heal_fraction = extras.healFraction
                if (extras.statusInflict)                  patch.status_inflict = extras.statusInflict
                if (extras.alwaysInflict !== undefined)    patch.always_inflict = extras.alwaysInflict
                if (extras.selfStatusInflict)              patch.self_status_inflict = extras.selfStatusInflict
                if (extras.selfDamage !== undefined)       patch.self_damage = extras.selfDamage
                if (extras.selfBoosts?.length)             patch.self_boosts = extras.selfBoosts
                if (extras.enemyDrops?.length)             patch.enemy_drops = extras.enemyDrops

                const { error } = await admin.from('moves').update(patch).eq('id', row.id)
                if (error) errors.push(`${row.identifier}: ${error.message}`)
                else seeded++
            } catch (e: any) {
                errors.push(`${row.identifier}: ${e.message}`)
            }
        }))

        const nextOffset = offset + BATCH_SIZE
        const hasMore = (rows as any[]).length === BATCH_SIZE
        return NextResponse.json({
            seeded,
            nextOffset: hasMore ? nextOffset : null,
            errors: errors.length ? errors : undefined,
            remaining: hasMore ? `Run again with offset ${nextOffset}` : 'Done.',
        })
    }

    // ── Phase 3: Backfill user_cards.moves from moves table ───────────────────
    if (mode === 'backfill') {
        const CARD_BATCH = 25
        const { data: userCards, error: fetchErr } = await admin
            .from('user_cards')
            .select('id, card_level, cards!inner(national_pokedex_number)')
            .order('id')
            .range(offset, offset + CARD_BATCH - 1)

        if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
        if (!userCards?.length) return NextResponse.json({ updated: 0, remaining: 'Done.' })

        let updated = 0
        const errors: string[] = []

        // Prefetch PokeAPI data for all unique dex numbers in this batch
        const dexNums = [...new Set((userCards as any[]).map(r => r.cards?.national_pokedex_number).filter(Boolean))]
        const pokeMap = new Map<number, any>()
        await Promise.all(dexNums.map(async (dex: number) => {
            const data = await fetchPokemonData(dex)
            if (data) pokeMap.set(dex, data)
        }))

        await Promise.allSettled((userCards as any[]).map(async (uc) => {
            try {
                const dex: number = uc.cards?.national_pokedex_number
                if (!dex) return
                const level: number = uc.card_level ?? 1
                const pokeData = pokeMap.get(dex)
                if (!pokeData) return

                // Level-gated moves available at this card's level, sorted by learnedAt desc
                const available = pokeData.levelMoves
                    .filter((m: any) => m.learnedAt <= Math.max(level, 1))
                    .sort((a: any, b: any) => b.learnedAt - a.learnedAt)
                    .slice(0, 4)

                if (!available.length) return

                // Look up each in the moves table
                const identifiers = available.map((m: any) => m.name)
                const { data: dbMoves } = await admin
                    .from('moves')
                    .select('*')
                    .in('identifier', identifiers)

                if (!dbMoves?.length) return

                // Build StoredMove array in the same order as available
                const storedMoves: StoredMove[] = available
                    .map((lm: any) => {
                        const db = (dbMoves as any[]).find(d => d.identifier === lm.name)
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
                            // Groq/MOVE_EXTRAS extras — MOVE_EXTRAS takes priority
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

                if (!storedMoves.length) return

                const { error } = await admin
                    .from('user_cards')
                    .update({ moves: storedMoves })
                    .eq('id', uc.id)

                if (error) errors.push(`${uc.id}: ${error.message}`)
                else updated++
            } catch (e: any) {
                errors.push(`${uc.id}: ${e.message}`)
            }
        }))

        const nextOffset = offset + CARD_BATCH
        const hasMore = (userCards as any[]).length === CARD_BATCH
        return NextResponse.json({
            updated,
            nextOffset: hasMore ? nextOffset : null,
            errors: errors.length ? errors : undefined,
            remaining: hasMore ? `Run again with offset ${nextOffset}` : 'Done.',
        })
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
}
