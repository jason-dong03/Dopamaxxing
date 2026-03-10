import { createClient } from '@/lib/supabase/server'
import { RARITY_ORDER, type Rarity } from '@/lib/rarityConfig'
import ProfileView from '@/components/ProfileView'

type RawCard = {
    id: string
    card_level: number
    cards: {
        id: string
        name: string
        image_url: string
        rarity: string
        national_pokedex_number: number
    } | null
}

export default async function ProfilePage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // fetch profile + favorited cards in parallel
    const [{ data: profile }, { data: favoritedRaw }] = await Promise.all([
        supabase
            .from('profiles')
            .select('username, first_name, last_name, profile_url, coins, level, xp')
            .eq('id', user?.id)
            .single(),
        supabase
            .from('user_cards')
            .select('id, card_level, cards(id, name, image_url, rarity, national_pokedex_number)')
            .eq('user_id', user?.id)
            .eq('is_favorited', true)
            .limit(50),
    ])

    // sort by rarity (highest first) and pick the best one as showcase
    const favorited = ((favoritedRaw ?? []) as unknown as RawCard[]).filter(
        (uc) => uc.cards !== null,
    )
    favorited.sort((a, b) => {
        const ai = RARITY_ORDER.indexOf(a.cards!.rarity as Rarity)
        const bi = RARITY_ORDER.indexOf(b.cards!.rarity as Rarity)
        return ai - bi
    })

    const showcaseRaw = favorited[0] ?? null
    const showcaseCard = showcaseRaw
        ? {
              id: showcaseRaw.id,
              card_level: showcaseRaw.card_level,
              cards: showcaseRaw.cards!,
          }
        : null

    return <ProfileView profile={profile} showcaseCard={showcaseCard} />
}
