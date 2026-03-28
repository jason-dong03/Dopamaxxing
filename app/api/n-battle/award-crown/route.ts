import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has the n-crown
    const { data: existing } = await supabase
        .from('user_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', 'n-crown')
        .maybeSingle()

    if (existing) {
        return NextResponse.json({ granted: false })
    }

    // Insert the crown into user_items
    await supabase
        .from('user_items')
        .insert({ user_id: user.id, item_id: 'n-crown', quantity: 1 })

    // Upsert n_quest_progress
    await supabase
        .from('n_quest_progress')
        .upsert({ user_id: user.id, battle_won: true }, { onConflict: 'user_id' })

    return NextResponse.json({ granted: true })
}
