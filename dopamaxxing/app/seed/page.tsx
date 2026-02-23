import { populateSet, getCardInfo, populateCards } from '@/lib/cache/populateCache'

export default async function SeedPage() {
    await populateCards ()
    return <div>Check your terminal for output</div>
}
