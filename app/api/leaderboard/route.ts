import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_METRICS = ['packs', 'br', 'level', 'coins'] as const
type Metric = (typeof VALID_METRICS)[number]

const METRIC_COLUMN: Record<Metric, string> = {
    packs:  'packs_opened',
    br:     'battle_power',
    level:  'level',
    coins:  'coins',
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('metric') ?? 'br'
    const metric = VALID_METRICS.includes(raw as Metric) ? (raw as Metric) : 'br'
    const col = METRIC_COLUMN[metric]

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('profiles')
        .select(`id, username, profile_url, ${col}`)
        .not(col, 'is', null)
        .gt(col, 0)
        .order(col, { ascending: false })
        .limit(10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map((row: any, i) => ({
        rank: i + 1,
        id: row.id,
        username: row.username ?? 'Trainer',
        profile_url: row.profile_url ?? null,
        value: Number(row[col] ?? 0),
    }))

    return NextResponse.json({ metric, rows })
}
