import { applyXP, RARITY_XP } from '@/lib/rarityConfig'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

type AddAction = { type: 'add'; cardId: string; coins: number; isHot: boolean }
type SellAction = { type: 'sell'; coins: number }
type FeedAction = { type: 'feed'; cardId: string }
type ActionItem = AddAction | SellAction | FeedAction

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { actions }: { actions: ActionItem[] } = await request.json()

        const adds = actions.filter((a): a is AddAction => a.type === 'add')
        const sells = actions.filter((a): a is SellAction => a.type === 'sell')
        const feeds = actions.filter((a): a is FeedAction => a.type === 'feed')

        // Run adds in parallel
        const addPromise =
            adds.length > 0
                ? Promise.all(
                      adds.map((a) =>
                          supabase.from('user_cards').insert({
                              user_id: user.id,
                              card_id: a.cardId,
                              card_xp: 0,
                              card_level: 1,
                              is_favorited: false,
                              worth: a.coins,
                              is_hot: a.isHot,
                          }),
                      ),
                  )
                : Promise.resolve(null)

        // Sum all sell coins into one profile update
        const totalCoins = sells.reduce((sum, s) => sum + s.coins, 0)
        const sellPromise =
            sells.length > 0
                ? supabase
                      .from('profiles')
                      .select('coins')
                      .eq('id', user.id)
                      .single()
                      .then(({ data: profile }) =>
                          supabase
                              .from('profiles')
                              .update({
                                  coins: (profile?.coins ?? 0) + totalCoins,
                              })
                              .eq('id', user.id),
                      )
                : Promise.resolve(null)

        // Run feeds in parallel (each card is independent)
        const feedPromise =
            feeds.length > 0
                ? Promise.all(
                      feeds.map(async (f) => {
                          const { data: userCard } = await supabase
                              .from('user_cards')
                              .select('*, cards(rarity)')
                              .eq('user_id', user.id)
                              .eq('card_id', f.cardId)
                              .single()
                          if (!userCard) return null
                          const rarity = (userCard.cards as { rarity: string }).rarity
                          const { newLevel, newXP } = applyXP(
                              userCard.card_level,
                              userCard.card_xp,
                              RARITY_XP[rarity],
                              rarity,
                          )
                          await supabase
                              .from('user_cards')
                              .update({ card_level: newLevel, card_xp: newXP })
                              .eq('user_id', user.id)
                              .eq('card_id', f.cardId)
                          return { cardId: f.cardId, newLevel, newXP }
                      }),
                  )
                : Promise.resolve(null)

        await Promise.all([addPromise, sellPromise, feedPromise])

        // increment cards_fed stat (non-blocking, fails gracefully before migration)
        if (feeds.length > 0) {
            supabase
                .from('profiles')
                .select('cards_fed')
                .eq('id', user.id)
                .single()
                .then(({ data }) =>
                    supabase
                        .from('profiles')
                        .update({ cards_fed: (data?.cards_fed ?? 0) + feeds.length })
                        .eq('id', user.id),
                )
                .catch(() => {})
        }

        return NextResponse.json({ success: true, totalCoinsEarned: totalCoins })
    } catch (error) {
        console.error('batch-action error:', error)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
