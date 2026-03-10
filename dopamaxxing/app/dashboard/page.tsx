import FlipCard from '@/components/FlipCard'
import PackOpening from '@/components/PackOpening'
import PackSelector from '@/components/PackSelector'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

export default async function Dashboard() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select(
            'username, first_name, last_name, profile_url, coins, xp, level',
        )
        .eq('id', user?.id)
        .single()

    return (
        <div className="min-h-screen p-4">
            <div className="bg-gray-900 rounded-2xl px-6 py-3 flex items-center gap-4 w-full max-w-sm mx-auto mt-2 flex-wrap">
                <Image
                    src={profile?.profile_url}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full flex-shrink-0"
                />
                <div className="flex flex-col">
                    <p className="text-white font-semibold text-sm leading-tight">
                        {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-gray-400 text-xs">
                        @{profile?.username}
                    </p>
                </div>
                <div className="flex gap-4 ml-auto text-xs text-gray-400">
                    <div className="flex flex-col items-center">
                        <span className="text-white font-semibold">
                            {profile?.level ?? 1}
                        </span>
                        <span>Level</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-white font-semibold">
                            {profile?.xp ?? 0}
                        </span>
                        <span>XP</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-white font-semibold">
                            {profile?.coins ?? 0}
                        </span>
                        <span>Coins</span>
                    </div>
                </div>

                {/* XP bar spans full width on its own row */}
                {(() => {
                    const level = profile?.level ?? 1
                    const xp = profile?.xp ?? 0
                    const xpNeeded = level * 100
                    const pct = Math.min((xp / xpNeeded) * 100, 100)
                    return (
                        <div className="w-full flex flex-col gap-1">
                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                                <div
                                    className="bg-white h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <p className="text-gray-600 text-xs text-right">
                                {xp} / {xpNeeded} XP
                            </p>
                        </div>
                    )
                })()}
            </div>

            <PackSelector />
        </div>
    )
}
