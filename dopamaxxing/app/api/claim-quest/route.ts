import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { QUEST_CATALOG } from '@/lib/quests'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { questId, notes } = await request.json()

        const quest = QUEST_CATALOG.find((q) => q.id === questId)
        if (!quest)
            return NextResponse.json({ error: 'Quest not found' }, { status: 404 })

        // check already completed
        const { data: existing } = await supabase
            .from('user_quest_completions')
            .select('id')
            .eq('user_id', user.id)
            .eq('quest_id', questId)
            .maybeSingle()

        if (existing)
            return NextResponse.json(
                { error: 'already_completed' },
                { status: 409 },
            )

        // award coins + xp, record completion — in parallel
        const { reward } = quest
        const [, { data: profile }] = await Promise.all([
            supabase.from('user_quest_completions').insert({
                user_id: user.id,
                quest_id: questId,
                notes: notes ?? null,
            }),
            supabase
                .from('profiles')
                .select('coins, xp, level')
                .eq('id', user.id)
                .single(),
        ])

        const newCoins = (profile?.coins ?? 0) + reward.coins
        const newXP = (profile?.xp ?? 0) + reward.xp

        await supabase
            .from('profiles')
            .update({ coins: newCoins, xp: newXP })
            .eq('id', user.id)

        return NextResponse.json({
            success: true,
            reward,
            newCoins,
            newXP,
        })
    } catch (error) {
        console.error('[claim-quest] error:', error)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
