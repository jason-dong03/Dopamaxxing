import { createClient } from '@/lib/supabase/server'
import QuestsView from '@/components/QuestsView'
import { QUEST_CATALOG } from '@/lib/quests'

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
                .from('user_quests')
                .select('quest_id, completed_at')
                .eq('user_id', user!.id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false }),
            supabase
                .from('user_cards')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user!.id),
        ])

    // build completed set (one-time only) + last completion timestamp per quest
    const completedQuestIds = new Set<string>()
    const lastCompletedAt: Record<string, string> = {}
    for (const c of (completions ?? []) as { quest_id: string; completed_at: string }[]) {
        if (!lastCompletedAt[c.quest_id]) {
            lastCompletedAt[c.quest_id] = c.completed_at
        }
        const quest = QUEST_CATALOG.find((q) => q.id === c.quest_id)
        if (quest && !quest.cooldownHours) {
            completedQuestIds.add(c.quest_id)
        }
    }

    const metrics = {
        packs_opened: profile?.packs_opened ?? 0,
        cards_owned: cardsOwned ?? 0,
        cards_fed: profile?.cards_fed ?? 0,
    }

    return (
        <div className="min-h-screen p-4">
            <QuestsView
                completedQuestIds={completedQuestIds}
                lastCompletedAt={lastCompletedAt}
                metrics={metrics}
            />
        </div>
    )
}
