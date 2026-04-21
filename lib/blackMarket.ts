import type { SupabaseClient } from '@supabase/supabase-js'
import { PACKS } from '@/lib/packs'

// Packs eligible for black market: level-gated, not test/box, cost < 600
const BM_ELIGIBLE = PACKS.filter(
    p => !p.test && (p.level_required ?? 0) >= 10 && p.cost < 600,
)

export function generateItems(count: number) {
    const pool = [...BM_ELIGIBLE].sort(() => Math.random() - 0.5)
    return pool.slice(0, Math.min(count, pool.length)).map(pack => ({
        pack_id: pack.id,
        discount_pct: parseFloat((0.25 + Math.random() * 0.20).toFixed(2)),  // 25-45%
        quantity: 5 + Math.floor(Math.random() * 11),  // 5-15
    }))
}

export type BmItem = {
    id: string
    pack_id: string
    discount_pct: number
    quantity_total: number
    quantity_remaining: number
}

export type BlackMarketState =
    | { active: true;  marketId: string; activeUntil: string; items: BmItem[] }
    | { active: false; nextMarketAt: string }

export async function getOrGenerateMarket(supabase: SupabaseClient): Promise<BlackMarketState> {
    const now = new Date().toISOString()

    // Active market?
    const { data: active } = await supabase
        .from('black_market')
        .select('id, active_until')
        .lte('active_from', now)
        .gte('active_until', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (active) {
        const { data: items } = await supabase
            .from('black_market_items')
            .select('id, pack_id, discount_pct, quantity_total, quantity_remaining')
            .eq('market_id', active.id)
        return { active: true, marketId: active.id, activeUntil: active.active_until, items: (items ?? []) as BmItem[] }
    }

    // Has a scheduled future market?
    const { data: latest } = await supabase
        .from('black_market')
        .select('next_market_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (latest?.next_market_at && new Date(latest.next_market_at) > new Date()) {
        return { active: false, nextMarketAt: latest.next_market_at }
    }

    // Generate a new market
    const durationMs  = (45 + Math.floor(Math.random() * 46)) * 60_000   // 45-90 min
    const cooldownMs  = (60 + Math.floor(Math.random() * 121)) * 60_000  // 60-180 min after close
    const activeUntil  = new Date(Date.now() + durationMs)
    const nextMarketAt = new Date(Date.now() + durationMs + cooldownMs)

    const { data: market, error } = await supabase
        .from('black_market')
        .insert({ active_until: activeUntil.toISOString(), next_market_at: nextMarketAt.toISOString() })
        .select('id')
        .single()

    if (error || !market) {
        // Race condition — another request beat us; return next scheduled time
        return { active: false, nextMarketAt: new Date(Date.now() + 30 * 60_000).toISOString() }
    }

    const picks = generateItems(3 + Math.floor(Math.random() * 3))  // 3-5 items
    await supabase.from('black_market_items').insert(
        picks.map(p => ({
            market_id: market.id,
            pack_id: p.pack_id,
            discount_pct: p.discount_pct,
            quantity_total: p.quantity,
            quantity_remaining: p.quantity,
        })),
    )

    const { data: items } = await supabase
        .from('black_market_items')
        .select('id, pack_id, discount_pct, quantity_total, quantity_remaining')
        .eq('market_id', market.id)

    return { active: true, marketId: market.id, activeUntil: activeUntil.toISOString(), items: (items ?? []) as BmItem[] }
}
