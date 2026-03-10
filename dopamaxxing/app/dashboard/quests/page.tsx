import { createClient } from '@/lib/supabase/server'
import QuestsView from '@/components/QuestsView'

export default async function QuestsPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // fetch profile stats + quest completions + owned card count in parallel
    const [{ data: profile }, { data: completions }, { count: cardsOwned }] =
        await Promise.all([
            supabase
                .from('profiles')
                .select('packs_opened, cards_fed')
                .eq('id', user!.id)
                .single(),
            supabase
                .from('user_quest_completions')
                .select('quest_id')
                .eq('user_id', user!.id),
            supabase
                .from('user_cards')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user!.id),
        ])

    const completedQuestIds = new Set(
        (completions ?? []).map((c: { quest_id: string }) => c.quest_id),
    )

    const metrics = {
        packs_opened: profile?.packs_opened ?? 0,
        cards_owned: cardsOwned ?? 0,
        cards_fed: profile?.cards_fed ?? 0,
    }

    return (
        <div className="min-h-screen p-4">
            <QuestsView
                completedQuestIds={completedQuestIds}
                metrics={metrics}
            />
        </div>
    )
}
