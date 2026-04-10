import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { recalcBattleRating } from '@/lib/battlePower'

const BATCH_SIZE = 20

export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // Recalculate all users (not just those with 0 — stale non-zero values need refresh too)
    const { data: users, error } = await admin
        .from('profiles')
        .select('id')
        .limit(BATCH_SIZE)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const updated: string[] = []
    const errors: string[] = []

    for (const profile of (users ?? [])) {
        try {
            await recalcBattleRating(admin, profile.id)
            updated.push(profile.id)
        } catch (e: any) {
            errors.push(`${profile.id}: ${e.message}`)
        }
    }

    return NextResponse.json({
        updated: updated.length,
        errors: errors.length > 0 ? errors : undefined,
    })
}
