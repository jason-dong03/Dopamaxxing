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

// GET /api/admin/users?search=&page=0
export async function GET(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''
    const page = parseInt(searchParams.get('page') ?? '0', 10)
    const limit = 50

    let query = admin
        .from('profiles')
        .select('id, username, first_name, last_name, coins, level, xp, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * limit, page * limit + limit - 1)

    if (search) {
        query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data ?? [], total: count ?? 0 })
}

// DELETE /api/admin/users  { id }
// Deletes the user from Supabase Auth (cascades to profiles + related rows via FK/RLS).
export async function DELETE(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await request.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

// PATCH /api/admin/users  { id, coins?, level? }
export async function PATCH(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { id: string; coins?: number; level?: number }
    const updates: Record<string, unknown> = {}
    if (body.coins !== undefined) updates.coins = body.coins
    if (body.level !== undefined) updates.level = body.level

    if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { error } = await admin.from('profiles').update(updates).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
