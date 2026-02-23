import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('username, profile_url, coins, level')
        .eq('id', user?.id)
        .single()

    return (
        <>
            <Navbar profile={profile} />
            <main className="pb-16">{children}</main>
        </>
    )
}
