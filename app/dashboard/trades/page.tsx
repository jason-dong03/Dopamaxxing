import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TradeView from '@/components/TradeView'

export const metadata = { title: 'Trades' }

export default async function TradesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: '28px 16px' }}>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>
                    Trades
                </h1>
                <p style={{ fontSize: '0.68rem', color: '#4b5563' }}>
                    Offer cards to other players. Accepted trades transfer cards instantly.
                </p>
            </div>
            <TradeView currentUserId={user.id} />
        </div>
    )
}
