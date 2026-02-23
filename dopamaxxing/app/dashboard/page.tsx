import FlipCard from '@/components/FlipCard'
import PackOpening from '@/components/PackOpening'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

export default async function Dashboard() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, profile_url')
        .eq('id', user?.id)
        .single()

    return (
        <div className="min-h-screen p-4">
            <div className="bg-gray-900 rounded-2xl p-5 flex items-center gap-4 w-fit mx-auto mt-4 min-w-64">
                {profile?.profile_url ? (
                    <Image
                        src={profile.profile_url}
                        alt="Profile"
                        width={56}
                        height={56}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-white text-xl">
                        {profile?.first_name?.[0] ?? '?'}
                    </div>
                )}
                <div>
                    <p className="text-white font-semibold text-lg">
                        {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-gray-400 text-sm">
                        @{profile?.username}
                    </p>
                </div>
            </div>
            <PackOpening />
        </div>
    )
}
