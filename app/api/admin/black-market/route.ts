import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateItems } from '@/lib/blackMarket'

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    return profile?.is_admin ? user : null
}

// POST /api/admin/black-market  { durationMinutes?: number }
export async function POST(req: NextRequest) {
    if (!await requireAdmin()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const body = await req.json().catch(() => ({}))
    const durationMinutes: number = Math.min(Math.max(Number(body.durationMinutes) || 60, 5), 360)

    const now = new Date()
    const activeFrom   = now.toISOString()
    const activeUntil  = new Date(now.getTime() + durationMinutes * 60_000).toISOString()
    const nextMarketAt = new Date(now.getTime() + (durationMinutes + 120) * 60_000).toISOString()

    const { data: market, error } = await admin
        .from('black_market')
        .insert({ active_from: activeFrom, active_until: activeUntil, next_market_at: nextMarketAt })
        .select('id')
        .single()

    if (error || !market) {
        return NextResponse.json({ error: error?.message ?? 'Failed to create market' }, { status: 500 })
    }

    const picks = generateItems(3 + Math.floor(Math.random() * 3))
    await admin.from('black_market_items').insert(
        picks.map(p => ({
            market_id: market.id,
            pack_id: p.pack_id,
            discount_pct: p.discount_pct,
            quantity_total: p.quantity,
            quantity_remaining: p.quantity,
        })),
    )

    return NextResponse.json({ success: true, marketId: market.id, activeUntil, durationMinutes })
}

// PATCH /api/admin/black-market — deletes all expired markets (+ items via cascade)
export async function PATCH() {
    if (!await requireAdmin()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const now = new Date().toISOString()
    const { data, error } = await admin
        .from('black_market')
        .delete()
        .lt('active_until', now)
        .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, purged: data?.length ?? 0 })
}

// DELETE /api/admin/black-market — closes any active market immediately
export async function DELETE() {
    if (!await requireAdmin()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const now = new Date().toISOString()
    const { data, error } = await admin
        .from('black_market')
        .update({ active_until: now })
        .lte('active_from', now)
        .gte('active_until', now)
        .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, closed: data?.length ?? 0 })
}
