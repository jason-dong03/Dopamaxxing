// Title rarity tiers and colors
// Titles are granted via quest rewards and displayed in profile/header

export type TitleRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'divine'

const TITLE_RARITY_MAP: Record<string, TitleRarity> = {

    // ── Feeder chain (I → V) ────────────────────────────────────────────────
    'Feeder I':             'common',
    'Feeder II':            'uncommon',
    'Feeder III':           'rare',
    'Feeder IV':            'epic',
    'Feeder V':             'legendary',

    // ── Pack chain (I → V) ──────────────────────────────────────────────────
    'Pack I':               'common',
    'Pack II':              'uncommon',
    'the Collector':        'rare',
    'Pack Fiend':           'epic',
    'Pack Overlord':        'legendary',

    // ── N / Unova story chain ───────────────────────────────────────────────
    'Curious Trainer':      'common',
    "N's Acquaintance":     'uncommon',
    "N's Ally":             'rare',
    "N's Rival":            'epic',
    "N's Champion":         'legendary',
    'Hero of Unova':        'legendary',
    'Champion':             'legendary',

    // ── Devotion / login chain ──────────────────────────────────────────────
    'the Devoted I':        'common',
    'the Devoted II':       'uncommon',
    'the Devoted III':      'rare',
    'the Devoted':          'uncommon',   // legacy

    // ── Discord / social ────────────────────────────────────────────────────
    'the Connected':        'common',

    // ── Special / secret ────────────────────────────────────────────────────
    'Early Adopter':        'rare',
    'Liberator':            'epic',
}

const RARITY_COLORS: Record<TitleRarity, string> = {
    common:    'var(--app-text-muted)',
    uncommon:  '#4ade80',       // green
    rare:      '#60a5fa',       // blue
    epic:      '#c084fc',       // purple
    legendary: '#fbbf24',       // gold
    divine:    '#f0abfc',       // pink / divine
}

export function getTitleColor(title: string): string {
    const rarity = TITLE_RARITY_MAP[title] ?? 'common'
    return RARITY_COLORS[rarity]
}

export function getTitleRarity(title: string): TitleRarity {
    return TITLE_RARITY_MAP[title] ?? 'common'
}
