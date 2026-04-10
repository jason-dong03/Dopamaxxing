import type { SupabaseClient } from '@supabase/supabase-js'
import { PACKS } from '@/lib/packs'

export const STOCK_REFRESH_MS = 5 * 60 * 1000 // 5 minutes
export const TOTAL_STOCK = 18

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

function packWeight(packId: string): number {
    const pack = PACKS.find(p => p.id === packId)
    if (!pack) return 2
    if (pack.aspect === 'box') return 1
    if (pack.special) return 2
    if (pack.theme_pokedex_ids) return 3
    return 8
}

function distributeStock(unlockedPackIds: string[]): Record<string, number> {
    if (unlockedPackIds.length === 0) return {}
    const weights = unlockedPackIds.map(id => ({ id, w: packWeight(id) }))
    const totalWeight = weights.reduce((s, x) => s + x.w, 0)
    const result: Record<string, number> = {}
    let remaining = TOTAL_STOCK
    weights.forEach(({ id, w }, i) => {
        const isLast = i === weights.length - 1
        const raw = isLast ? remaining : Math.round((w / totalWeight) * TOTAL_STOCK)
        const qty = Math.max(0, Math.min(raw, remaining))
        result[id] = qty
        remaining -= qty
    })
    return result
}

/**
 * Returns current stock for the user, regenerating if expired.
 * Always enforces the 5-minute window — never bypasses on expiry.
 */
export async function getOrRefreshStock(
    supabase: SupabaseClient,
    userId: string,
): Promise<{ stock: Record<string, number>; nextRefreshAt: string }> {
    const { data: existingRows } = await supabase
        .from('pack_stock')
        .select('pack_id, quantity, refreshed_at')
        .eq('user_id', userId)

    const rows = existingRows ?? []
    const now = Date.now()
    const refreshedAt = rows[0] ? new Date(rows[0].refreshed_at).getTime() : 0
    const expired = now - refreshedAt >= STOCK_REFRESH_MS

    if (!expired && rows.length > 0) {
        const stock: Record<string, number> = {}
        for (const r of rows) stock[r.pack_id] = r.quantity
        return { stock, nextRefreshAt: new Date(refreshedAt + STOCK_REFRESH_MS).toISOString() }
    }

    // Regenerate
    const { data: profile } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', userId)
        .single()
    const userLevel = profile?.level ?? 1

    const unlockedIds = PACKS
        .filter(p => !p.test)
        .filter(p => userLevel >= (PACK_UNLOCK_LEVEL[p.id] ?? 1))
        .map(p => p.id)

    const newStock = distributeStock(unlockedIds)
    const newRefreshedAt = new Date().toISOString()

    if (Object.keys(newStock).length > 0) {
        await supabase.from('pack_stock').upsert(
            Object.entries(newStock).map(([pack_id, quantity]) => ({
                user_id: userId,
                pack_id,
                quantity,
                refreshed_at: newRefreshedAt,
            })),
            { onConflict: 'user_id,pack_id' },
        )
        const oldIds = rows.map(r => r.pack_id).filter(id => !(id in newStock))
        if (oldIds.length > 0) {
            await supabase.from('pack_stock').delete().eq('user_id', userId).in('pack_id', oldIds)
        }
    }

    return {
        stock: newStock,
        nextRefreshAt: new Date(Date.now() + STOCK_REFRESH_MS).toISOString(),
    }
}
