import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title } = await request.json() as { title: string | null }

    // Verify the user actually earned this title (or is clearing it)
    if (title !== null) {
        const { data: earned } = await supabase
            .from('user_quests')
            .select('quests!inner(title_reward)')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .eq('quests.title_reward', title)
            .limit(1)
            .maybeSingle()

        if (!earned) return NextResponse.json({ error: 'Title not earned' }, { status: 403 })
    }

    await supabase
        .from('profiles')
        .update({ active_title: title })
        .eq('id', user.id)

    return NextResponse.json({ ok: true })
}
