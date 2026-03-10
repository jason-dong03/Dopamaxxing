import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { QUEST_CATALOG } from '@/lib/quests'
import { applyXP } from '@/lib/xp'

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

        // check completion / cooldown
        const { data: lastCompletion } = await supabase
            .from('user_quests')
            .select('completed_at')
            .eq('user_id', user.id)
            .eq('quest_id', questId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (lastCompletion) {
            if (!quest.cooldownHours) {
                return NextResponse.json({ error: 'already_completed' }, { status: 409 })
            }
            const cooldownMs = quest.cooldownHours * 60 * 60 * 1000
            const msLeft = cooldownMs - (Date.now() - new Date(lastCompletion.completed_at).getTime())
            if (msLeft > 0) {
                return NextResponse.json({ error: 'on_cooldown', msLeft }, { status: 429 })
            }
        }

        // award coins + xp, record completion — in parallel
        const { reward } = quest
        const [, { data: profile }] = await Promise.all([
            supabase.from('user_quests').insert({
                user_id: user.id,
                quest_id: questId,
                status: 'completed',
                notes: notes ?? null,
                completed_at: new Date().toISOString(),
            }),
            supabase
                .from('profiles')
                .select('coins, xp, level')
                .eq('id', user.id)
                .single(),
        ])

        const newCoins = (profile?.coins ?? 0) + reward.coins
        const { xp: newXP, level: newLevel } = applyXP(
            profile?.xp ?? 0,
            profile?.level ?? 1,
            reward.xp,
        )

        await supabase
            .from('profiles')
            .update({ coins: newCoins, xp: newXP, level: newLevel })
            .eq('id', user.id)

        return NextResponse.json({
            success: true,
            reward,
            newCoins,
            newXP,
            newLevel,
        })
    } catch (error) {
        console.error('[claim-quest] error:', error)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
