// PUT  /api/battle-lineup/[id]  — update lineup name or cards
// DELETE /api/battle-lineup/[id]  — delete a lineup
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { name?: string; slots?: string[] }

    if (body.slots !== undefined) {
        if (!Array.isArray(body.slots) || body.slots.length < 1 || body.slots.length > 5) {
            return NextResponse.json({ error: 'Lineup must be 1–5 cards' }, { status: 400 })
        }
        const { data: owned } = await supabase
            .from('user_cards')
            .select('id')
            .eq('user_id', user.id)
            .in('id', body.slots)
        if (!owned || owned.length !== body.slots.length) {
            return NextResponse.json({ error: 'Invalid card selection' }, { status: 400 })
        }
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.slots !== undefined) updates.slots = body.slots

    const { id } = await params
    const { error } = await supabase
        .from('battle_lineups')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { error } = await supabase
        .from('battle_lineups')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
