import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getOrRefreshStock } from '@/lib/packStock'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stock, nextRefreshAt } = await getOrRefreshStock(supabase, user.id)
    return NextResponse.json({ stock, next_refresh_at: nextRefreshAt })
}
