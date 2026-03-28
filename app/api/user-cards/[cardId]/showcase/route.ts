// POST /api/user-cards/[cardId]/showcase
// Sets a card as the user's showcase (is_showcased=true).
// Clears all other user cards first so only 1 can be showcased at a time.
// DELETE removes the showcase from this card.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> },
) {
    const { cardId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Clear any existing showcase for this user
    await supabase
        .from('user_cards')
        .update({ is_showcased: false })
        .eq('user_id', user.id)
        .eq('is_showcased', true)

    // Set the new showcase
    const { error } = await supabase
        .from('user_cards')
        .update({ is_showcased: true })
        .eq('id', cardId)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> },
) {
    const { cardId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
        .from('user_cards')
        .update({ is_showcased: false })
        .eq('id', cardId)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
