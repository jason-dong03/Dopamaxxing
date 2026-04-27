// POST /api/friends/request - send a friend request
// DELETE /api/friends/request - cancel / remove a friendship
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { addresseeId } = await request.json()
    if (!addresseeId) return NextResponse.json({ error: 'addresseeId required' }, { status: 400 })
    if (addresseeId === user.id) return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 })

    const supabase = createAdminClient()

    // check if already following (one-way check: me → them)
    const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('addressee_id', addresseeId)
        .maybeSingle()

    if (existing) {
        if (existing.status === 'accepted') return NextResponse.json({ error: 'Already following' }, { status: 409 })
        // If rejected/pending, delete and re-insert
        await supabase.from('friendships').delete().eq('id', existing.id)
    }

    const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'accepted',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { friendshipId } = await request.json()
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
