import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { pickRarity, calculateBuyback } from '@/lib/rarityConfig'
import { PACKS } from '@/lib/packs'
import { applyXP, XP_PER_PACK } from '@/lib/xp'

const pityRarities = ['Legendary', 'Divine', 'Celestial', '???']

// ─── module-level set card cache (per worker, 1hr TTL) ────────────────────────
type CardRow = Record<string, unknown>
const setCardsCache = new Map<string, { cards: CardRow[]; expires: number }>()

async function getCardsForSet(
    supabase: Awaited<ReturnType<typeof createClient>>,
    setId: string,
): Promise<CardRow[]> {
    const cached = setCardsCache.get(setId)
    if (cached && Date.now() < cached.expires) return cached.cards

    const { data } = await supabase.from('cards').select('*').eq('set_id', setId)
    const cards = (data as CardRow[]) ?? []
    setCardsCache.set(setId, { cards, expires: Date.now() + 60 * 60 * 1000 })
    return cards
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { setId } = await request.json()

        // look up pack cost from catalog
        const packDef = PACKS.find((p) => p.id === setId)
        const cost = packDef?.cost ?? 0

        // fetch profile + all set cards in parallel
        const [{ data: profile }, allCards] = await Promise.all([
            supabase
                .from('profiles')
                .select('pity_counter, pity_threshold, coins, xp, level')
                .eq('id', user.id)
                .single(),
            getCardsForSet(supabase, setId),
        ])

        // ── coin check ────────────────────────────────────────────────────────
        if (cost > 0 && (profile?.coins ?? 0) < cost) {
            return NextResponse.json(
                { error: 'insufficient_coins', cost, coins: profile?.coins ?? 0 },
                { status: 402 },
            )
        }

        if (allCards.length === 0) {
            return NextResponse.json({ error: 'No cards in set' }, { status: 400 })
        }

        // group cards by rarity in memory — no more per-slot DB queries
        const byRarity = new Map<string, CardRow[]>()
        for (const card of allCards) {
            const r = card.rarity as string
            if (!byRarity.has(r)) byRarity.set(r, [])
            byRarity.get(r)!.push(card)
        }

        const isSpecialBox = byRarity.size === 1 && byRarity.has('???')

        const pickedCards: CardRow[] = []

        const cardPool = isSpecialBox
            ? allCards.map((c) => ({
                  id: c.id,
                  image_url: c.image_url,
                  name: c.name,
                  rarity: c.rarity,
              }))
            : undefined

        if (isSpecialBox) {
            const pool = byRarity.get('???')!
            pickedCards.push(pool[Math.floor(Math.random() * pool.length)])
        } else {
            for (let i = 0; i < 5; i++) {
                let selectedCard: CardRow | null = null
                let attempts = 0

                while (!selectedCard && attempts < 10) {
                    attempts++
                    const rarity = pickRarity()
                    const pool = byRarity.get(rarity)
                    if (pool && pool.length > 0) {
                        selectedCard =
                            pool[Math.floor(Math.random() * pool.length)]
                    }
                }

                if (selectedCard) pickedCards.push(selectedCard)
            }
        }

        const hitHighRarity = pickedCards.some((c) =>
            pityRarities.includes(c.rarity as string),
        )
        const newPityCounter = hitHighRarity
            ? 0
            : (profile?.pity_counter ?? 0) + 1

        const cardIds = pickedCards.map((c) => c.id)

        const { xp: newXP, level: newLevel } = applyXP(
            profile?.xp ?? 0,
            profile?.level ?? 1,
            XP_PER_PACK,
        )

        // update pity + coins + xp/level, and check ownership — in parallel
        const [, { data: owned }] = await Promise.all([
            supabase
                .from('profiles')
                .update({
                    pity_counter: newPityCounter,
                    coins: (profile?.coins ?? 0) - cost,
                    xp: newXP,
                    level: newLevel,
                })
                .eq('id', user.id),
            supabase
                .from('user_cards')
                .select('card_id')
                .eq('user_id', user.id)
                .in('card_id', cardIds),
        ])

        // fire-and-forget packs_opened increment (requires DB migration first)
        supabase
            .from('profiles')
            .select('packs_opened')
            .eq('id', user.id)
            .single()
            .then(({ data: p }) =>
                supabase
                    .from('profiles')
                    .update({ packs_opened: (p?.packs_opened ?? 0) + 1 })
                    .eq('id', user.id),
            )
            .catch(() => {})

        const ownedIds = new Set(owned?.map((o) => o.card_id) ?? [])

        const cardsWithMeta = pickedCards.map((card) => ({
            ...card,
            isNew: !ownedIds.has(card.id as string),
            worth: card.market_price_usd,
            pokedex_num: card.national_pokedex_number,
            ...calculateBuyback(card.rarity as string),
        }))

        return NextResponse.json({ cards: cardsWithMeta, cardPool })
    } catch (err) {
        console.error('[open-pack] unhandled error:', err)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
