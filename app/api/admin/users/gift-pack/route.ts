import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function verifyAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const admin = createAdminClient()
    const { data } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    return (data as any)?.is_admin ? admin : null
}

// POST /api/admin/users/gift-pack  { userId, packId, quantity }
export async function POST(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { userId, packId, quantity = 1 } = await request.json() as { userId: string; packId: string; quantity?: number }
    if (!userId || !packId) return NextResponse.json({ error: 'userId and packId required' }, { status: 400 })
    const qty = Math.min(Math.max(1, quantity), 50)

    const rows = Array.from({ length: qty }, () => ({
        user_id: userId,
        pack_id: packId,
        source: 'admin_gift',
    }))

    const { error } = await admin.from('pending_packs').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, gifted: qty })
}
