import type { SupabaseClient } from '@supabase/supabase-js'
import { PACKS } from '@/lib/packs'

// Each group refreshes on its own independent timer
export const REFRESH_MS = {
    standard: 5  * 60 * 1000,  // 5 min
    special:  8  * 60 * 1000,  // 8 min
    box:      15 * 60 * 1000,  // 15 min
}

const PACK_UNLOCK_LEVEL: Record<string, number> = {
    'sv02':            1,
    'sv03':            1,
    'sv03.5':          1,
    'sv04.5':          1,
    'sv08':            1,
    'sv08.5':          1,
    'sv10':            1,
    'sv10.5b':         10,
    'sv10.5w':         10,
    'swsh1':           5,
    'swsh11':          5,
    'swsh12.5':        5,
    'me02':            10,
    'me02.5':          10,
    'base1':           15,
    'base5':           15,
    'ex4':             20,
    'ex7':             20,
    'xy7':             20,
    'theme-charizard': 15,
    'base1-1ed':       25,
    'theme-legendary': 50,
    'xy-p-poncho':     50,
}

type Group = 'standard' | 'special' | 'box'

function getGroup(pack: { aspect?: string; special?: boolean; theme_pokedex_ids?: number[] }): Group {
    if (pack.aspect === 'box') return 'box'
    if (pack.special || pack.theme_pokedex_ids?.length) return 'special'
    return 'standard'
}

/** Random stock roll per pack — up to 8 for standard, scarcer for rarer types */
function rollStock(packId: string): number {
    const pack = PACKS.find(p => p.id === packId)
    if (!pack) return 0

    const r = Math.random()

    // Crates/boxes: extremely rare — 90% chance of 0, 10% chance of 1
    if (pack.aspect === 'box') {
        return r < 0.90 ? 0 : 1
    }

    // Base sets: rare (ids containing 'base')
    if (packId.includes('base')) {
        if (r < 0.25) return 0
        if (r < 0.55) return 1
        if (r < 0.80) return 2
        if (r < 0.95) return 3
        return 4
    }

    // Special / themed packs: moderate scarcity
    if (pack.special || pack.theme_pokedex_ids?.length) {
        if (r < 0.12) return 0
        if (r < 0.35) return 1
        if (r < 0.60) return 2
        if (r < 0.80) return 3
        if (r < 0.93) return 4
        return 5
    }

    // Standard packs: dramatic variance, up to 8
    if (r < 0.05) return 1
    if (r < 0.15) return 2
    if (r < 0.35) return 3
    if (r < 0.55) return 4
    if (r < 0.72) return 5
    if (r < 0.85) return 6
    if (r < 0.94) return 7
    return 8
}

export type StockResult = {
    stock: Record<string, number>
    nextRefreshAt: { standard: string; special: string; box: string }
}

/**
 * Returns current stock, regenerating each group independently when expired.
 * Never bypasses the stock cap — expired stock is always regenerated before use.
 */
export async function getOrRefreshStock(
    supabase: SupabaseClient,
    userId: string,
): Promise<StockResult> {
    const [{ data: profile }, { data: existingRows }] = await Promise.all([
        supabase.from('profiles').select('level').eq('id', userId).single(),
        supabase.from('pack_stock').select('pack_id, quantity, refreshed_at').eq('user_id', userId),
    ])

    const userLevel = profile?.level ?? 1
    const rows = existingRows ?? []
    const rowMap = new Map(rows.map(r => [r.pack_id as string, r]))

    const unlockedPacks = PACKS
        .filter(p => !p.test)
        .filter(p => userLevel >= (PACK_UNLOCK_LEVEL[p.id] ?? 1))

    const now = Date.now()
    const newRefreshedAt = new Date().toISOString()

    const stock: Record<string, number> = {}
    const upsertRows: { user_id: string; pack_id: string; quantity: number; refreshed_at: string }[] = []

    // Track the oldest refreshed_at per group (to determine next refresh time)
    const groupRefreshed: Record<Group, number> = { standard: 0, special: 0, box: 0 }
    const groupExpired: Record<Group, boolean> = { standard: false, special: false, box: false }

    // Determine which groups are expired based on existing rows
    for (const pack of unlockedPacks) {
        const group = getGroup(pack)
        const row = rowMap.get(pack.id)
        const refreshedAt = row ? new Date(row.refreshed_at).getTime() : 0
        if (refreshedAt > groupRefreshed[group]) groupRefreshed[group] = refreshedAt
    }
    for (const g of ['standard', 'special', 'box'] as Group[]) {
        groupExpired[g] = now - groupRefreshed[g] >= REFRESH_MS[g]
    }

    // Build stock: use existing for fresh groups, regenerate for expired groups
    for (const pack of unlockedPacks) {
        const group = getGroup(pack)
        if (groupExpired[group]) {
            const qty = rollStock(pack.id)
            stock[pack.id] = qty
            upsertRows.push({ user_id: userId, pack_id: pack.id, quantity: qty, refreshed_at: newRefreshedAt })
        } else {
            const row = rowMap.get(pack.id)
            stock[pack.id] = row ? Number(row.quantity) : 0
        }
    }

    // Persist regenerated rows
    if (upsertRows.length > 0) {
        await supabase.from('pack_stock').upsert(upsertRows, { onConflict: 'user_id,pack_id' })
        // Remove stale rows for packs no longer unlocked
        const unlockedIds = new Set(unlockedPacks.map(p => p.id))
        const oldIds = rows.map(r => r.pack_id as string).filter(id => !unlockedIds.has(id))
        if (oldIds.length > 0) {
            await supabase.from('pack_stock').delete().eq('user_id', userId).in('pack_id', oldIds)
        }
    }

    // Compute next refresh time for each group
    const nextRefreshAt = {
        standard: new Date((groupExpired.standard ? now : groupRefreshed.standard) + REFRESH_MS.standard).toISOString(),
        special:  new Date((groupExpired.special  ? now : groupRefreshed.special)  + REFRESH_MS.special).toISOString(),
        box:      new Date((groupExpired.box      ? now : groupRefreshed.box)      + REFRESH_MS.box).toISOString(),
    }

    return { stock, nextRefreshAt }
}
