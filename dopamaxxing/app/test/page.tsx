import TCGdex from '@tcgdex/sdk'

export default async function TestPage() {
    const tcgdex = new TCGdex('ja')
    const sets = await tcgdex.fetch('sets')
    console.log(sets)
    return (
        <div className="p-6">
            <pre className="text-xs">{JSON.stringify(sets, null, 2)}</pre>
        </div>
    )
}
