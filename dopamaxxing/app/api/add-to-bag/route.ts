import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { cardId, worth, isHot } = await request.json()

        const { error } = await supabase.from('user_cards').insert({
            user_id: user?.id,
            card_id: cardId,
            card_xp: 0,
            card_level: 1,
            is_favorited: false,
            worth: worth,
            is_hot: isHot,
        })
        if (error) console.error('Error inserting card:', error)

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
