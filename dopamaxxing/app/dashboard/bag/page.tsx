import { createClient } from '@/lib/supabase/server'
import BagPage from '@/components/Bag'

export default async function Bag() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { data: userCards } = await supabase
        .from('user_cards')
        .select(
            '*, cards(id, name, image_url, rarity, national_pokedex_number, hp)',
        )
        .eq('user_id', user?.id)
        .order('obtained_at', { ascending: false })

    return <BagPage userCards={userCards ?? []} />
}
