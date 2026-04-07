import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// EUR → USD conversion multiplier applied to Cardmarket prices.
// Update periodically — or wire in a live exchange rate API if needed.
const EUR_TO_USD = 1.10

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en'

// Concurrency limit for parallel card fetches
const BATCH_SIZE = 20

type TCGdexCardResume = {
    id: string
    localId: string
    name: string
}

type TCGdexCard = {
    id: string
    localId: string
    name: string
    variants?: {
        holo?: boolean
        normal?: boolean
        reverse?: boolean
        firstEdition?: boolean
    }
    pricing?: {
        cardmarket?: {
            avg30?: number | null
            'avg30-holo'?: number | null
            trend?: number | null
            'trend-holo'?: number | null
        } | null
        tcgplayer?: {
            holofoil?: { market?: number | null } | null
            normal?: { market?: number | null } | null
            reverseHolofoil?: { market?: number | null } | null
        } | null
    }
}

/**
 * Pick the best EUR price from a TCGdex card, then convert to USD.
 *
 * Priority:
 *  1. TCGPlayer market price (already USD) if available
 *  2. Cardmarket holo price (EUR→USD) if card is holo-only
 *  3. Cardmarket avg30 (EUR→USD) as fallback
 */
function extractUsdPrice(card: TCGdexCard): number {
    const tcg = card.pricing?.tcgplayer
    if (tcg) {
        const usd =
            tcg.holofoil?.market ??
            tcg.normal?.market ??
            tcg.reverseHolofoil?.market
        if (usd && usd > 0) return parseFloat(usd.toFixed(2))
    }

    const cm = card.pricing?.cardmarket
    if (!cm) return 0

    const isHoloOnly = card.variants?.holo && !card.variants?.normal
    const eurPrice = isHoloOnly
        ? (cm['avg30-holo'] ?? cm.avg30 ?? 0)
        : (cm.avg30 ?? cm['avg30-holo'] ?? 0)

    if (!eurPrice || eurPrice <= 0) return 0
    return parseFloat((eurPrice * EUR_TO_USD).toFixed(2))
}

async function fetchCardDetail(cardId: string): Promise<TCGdexCard | null> {
    try {
        const res = await fetch(`${TCGDEX_BASE}/cards/${cardId}`)
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

/** Fetch cards in parallel batches to avoid N+1 sequential calls. */
async function fetchCardsBatched(cardIds: string[]): Promise<Map<string, TCGdexCard>> {
    const result = new Map<string, TCGdexCard>()

    for (let i = 0; i < cardIds.length; i += BATCH_SIZE) {
        const batch = cardIds.slice(i, i + BATCH_SIZE)
        const cards = await Promise.all(batch.map(fetchCardDetail))
        for (const card of cards) {
            if (card?.id) result.set(card.id, card)
        }
    }

    return result
}

// ─── GET — list sets ──────────────────────────────────────────────────────────
export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('get_set_counts')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ sets: data ?? [] })
}

// ─── POST — reprice a set via TCGdex + Cardmarket ────────────────────────────
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { setId } = await request.json() as { setId: string }
    if (!setId) return NextResponse.json({ error: 'setId required' }, { status: 400 })

    const admin = createAdminClient()

    try {
        // 1. Fetch card list for the set from TCGdex (single call, returns stubs)
        const setRes = await fetch(`${TCGDEX_BASE}/sets/${setId}`)
        if (!setRes.ok) {
            return NextResponse.json(
                { error: `TCGdex set "${setId}" not found (${setRes.status})` },
                { status: 404 },
            )
        }
        const setData = await setRes.json()
        const cardStubs: TCGdexCardResume[] = setData.cards ?? []

        if (cardStubs.length === 0) {
            return NextResponse.json({ error: 'No cards in this set on TCGdex' }, { status: 400 })
        }

        // 2. Fetch full card details in parallel batches (pricing is only on full cards)
        const cardIds = cardStubs.map(c => c.id)
        const cardMap = await fetchCardsBatched(cardIds)

        // 3. Our DB cards for this set — used to confirm what exists
        const { data: ourCards } = await admin
            .from('cards')
            .select('id, name')
            .eq('set_id', setId)

        const ourCardIds = new Set((ourCards ?? []).map(c => c.id))

        // 4. Build update list — only for cards that exist in our DB
        const updates: { card_id: string; market_price_usd: number }[] = []
        const logs: { cardId: string; name: string; newPrice: number; source: string }[] = []
        let noPrice = 0

        for (const stub of cardStubs) {
            if (!ourCardIds.has(stub.id)) continue

            const card = cardMap.get(stub.id)
            if (!card) { noPrice++; continue }

            const price = extractUsdPrice(card)
            if (price === 0) noPrice++

            // Determine price source for logs
            const hasTcgPlayer = !!(card.pricing?.tcgplayer?.holofoil?.market
                || card.pricing?.tcgplayer?.normal?.market)
            const source = hasTcgPlayer ? 'tcgplayer' : 'cardmarket'

            updates.push({ card_id: stub.id, market_price_usd: price })
            logs.push({ cardId: stub.id, name: stub.name, newPrice: price, source })
        }

        if (updates.length === 0) {
            return NextResponse.json({ updated: 0, message: 'No matching cards found.', logs: [] })
        }

        // 5. Bulk update via existing RPC
        const { data: rpcData, error: rpcError } = await admin.rpc('bulk_reprice_cards', {
            price_updates: updates,
        })
        if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 })

        const totalUpdated = Array.isArray(rpcData) && rpcData.length > 0
            ? Number(rpcData[0].user_cards_updated ?? 0)
            : 0

        return NextResponse.json({
            updated: totalUpdated,
            repriced: updates.length,
            noPrice,
            eurToUsd: EUR_TO_USD,
            message: `Done — ${updates.length} cards repriced (${noPrice} had no price). ${totalUpdated} user cards updated.`,
            logs,
        })
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message ?? 'Failed to reprice set' },
            { status: 500 },
        )
    }
}
