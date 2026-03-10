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

        const { card_buyback_amount } = await request.json()
        const { data: profile } = await supabase
            .from('profiles')
            .select('coins')
            .eq('id', user.id)
            .single()
        const { error } = await supabase
            .from('profiles')
            .update({
                coins: (profile?.coins ?? 0) + card_buyback_amount,
            })
            .eq('id', user.id)
        if (error) console.error('Error updating coins:', error)

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
