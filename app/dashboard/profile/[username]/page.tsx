import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RARITY_ORDER, type Rarity } from '@/lib/rarityConfig'
import ProfileView from '@/components/ProfileView'
import { notFound } from 'next/navigation'
import type { RawCard } from '@/lib/types'

export default async function UserProfilePage({
    params,
}: {
    params: Promise<{ username: string }>
}) {
    const { username } = await params
    const supabase = await createClient()
    const admin = createAdminClient()
    const {
        data: { user: me },
    } = await supabase.auth.getUser()

    // Resolve username → profile first
    const { data: profile } = await admin
        .from('profiles')
        .select(
            'id, username, first_name, last_name, profile_url, coins, level, xp, active_title, battle_power',
        )
        .eq('username', username)
        .single()

    if (!profile) return notFound()

    const userId = profile.id

    const [
        { data: favoritedRaw },
        { data: friendshipsRaw },
        { data: earnedRaw },
        { data: allAchievements },
        { data: bindersRaw },
        { data: friendshipRaw },
    ] = await Promise.all([
        admin
            .from('user_cards')
            .select(
                'id, card_level, grade, worth, nature, cards(id, name, image_url, image_url_hi, rarity, national_pokedex_number, set_id)',
            )
            .eq('user_id', userId)
            .eq('is_favorited', true)
            .limit(50),
        admin
            .from('friendships')
            .select('id, requester_id, addressee_id')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId),
        supabase.from('achievements').select('*'),
        supabase
            .from('binders')
            .select('id, name, color, is_featured')
            .eq('user_id', userId)
            .eq('is_featured', true)
            .order('created_at', { ascending: false }),
        // check friendship status between me and this user
        me
            ? admin
                  .from('friendships')
                  .select('id, status, requester_id, addressee_id')
                  .or(
                      `and(requester_id.eq.${me.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me.id})`,
                  )
                  .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ])

    // showcase card
    const favorited = ((favoritedRaw ?? []) as unknown as RawCard[]).filter(
        (uc) => uc.cards !== null,
    )
    favorited.sort((a, b) => {
        const ai = RARITY_ORDER.indexOf(a.cards!.rarity as Rarity)
        const bi = RARITY_ORDER.indexOf(b.cards!.rarity as Rarity)
        return ai - bi
    })
    const showcaseRaw = favorited[0] ?? null
    const showcaseCard = showcaseRaw
        ? {
              id: showcaseRaw.id,
              card_level: showcaseRaw.card_level,
              grade: showcaseRaw.grade,
              raw: (showcaseRaw as any).cards.market_price_usd ?? 0,
              worth: (showcaseRaw as any).worth ?? null,
              nature: (showcaseRaw as any).nature ?? null,
              cards: showcaseRaw.cards!,
          }
        : null

    // social graph — fetch profiles separately to avoid FK join issues
    const earnedSet = new Set(
        (earnedRaw ?? []).map((r: any) => r.achievement_id),
    )
    const friendships = friendshipsRaw ?? []
    const followingIds = friendships
        .filter((f: any) => f.requester_id === userId)
        .map((f: any) => f.addressee_id)
    const followerIds = friendships
        .filter((f: any) => f.addressee_id === userId)
        .map((f: any) => f.requester_id)
    const allUniqueIds = [...new Set([...followingIds, ...followerIds])]
    const { data: socialProfiles } =
        allUniqueIds.length > 0
            ? await admin
                  .from('profiles')
                  .select('id, username, profile_url')
                  .in('id', allUniqueIds)
            : { data: [] }
    const profileMap = Object.fromEntries((socialProfiles ?? []).map((p: any) => [p.id, { id: p.id, username: p.username, profile_url: p.profile_url }]))
    const followerSet = new Set(followerIds)
    const following = followingIds.map((id: string) => profileMap[id]).filter(Boolean)
    const followers = followerIds.map((id: string) => profileMap[id]).filter(Boolean)
    const friends = followingIds.filter((id: string) => followerSet.has(id)).map((id: string) => profileMap[id]).filter(Boolean)

    // achievements (show visible + earned hidden)
    const achievements = (allAchievements ?? [])
        .filter((a: any) => !a.is_hidden || earnedSet.has(a.id))
        .map((a: any) => ({
            id: a.id,
            name: a.is_hidden && !earnedSet.has(a.id) ? '???' : a.name,
            description:
                a.is_hidden && !earnedSet.has(a.id) ? '???' : a.description,
            icon: a.is_hidden && !earnedSet.has(a.id) ? '🔒' : a.icon,
            isHidden: a.is_hidden,
            coinReward: a.coin_reward,
            earned: earnedSet.has(a.id),
        }))

    return (
        <ProfileView
            profile={profile}
            showcaseCard={showcaseCard}
            following={following}
            followers={followers}
            friends={friends}
            achievements={achievements}
            binders={bindersRaw ?? []}
            viewingUserId={userId}
            currentUserId={me?.id}
            friendshipStatus={friendshipRaw?.status ?? null}
            friendshipId={friendshipRaw?.id ?? null}
            friendshipRequesterId={friendshipRaw?.requester_id ?? null}
        />
    )
}
