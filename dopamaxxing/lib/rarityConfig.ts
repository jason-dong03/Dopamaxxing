import type React from 'react'

// ─── rarity order (highest → lowest) ─────────────────────────────────────────
export const RARITY_ORDER = [
    '???',
    'Celestial',
    'Divine',
    'Legendary',
    'Mythical',
    'Epic',
    'Rare',
    'Uncommon',
    'Common',
] as const

export type Rarity = (typeof RARITY_ORDER)[number]

// ─── display ──────────────────────────────────────────────────────────────────
export const RARITY_GLOW: Record<string, string> = {
    Common: '156, 163, 175',
    Uncommon: '74, 222, 128',
    Rare: '96, 165, 250',
    Epic: '168, 85, 247',
    Mythical: '220, 38, 38',
    Legendary: '234, 179, 8',
    Divine: '244, 114, 182',
    Celestial: '220, 240, 255',
    '???': 'rainbow',
}

export const RARITY_COLOR: Record<Rarity, string> = {
    Common: '#9ca3af',
    Uncommon: '#4ade80',
    Rare: '#60a5fa',
    Epic: '#a855f7',
    Mythical: '#ef4444',
    Legendary: '#eab308',
    Divine: '#f472b4',
    Celestial: '#e8f4ff',
    '???': 'rainbow',
}

export const RARITY_ABBREV: Record<Rarity, string> = {
    Common: 'C',
    Uncommon: 'U',
    Rare: 'R',
    Epic: 'E',
    Mythical: 'M',
    Legendary: 'L',
    Divine: 'D',
    Celestial: 'CL',
    '???': '?',
}

// ─── pull weights ─────────────────────────────────────────────────────────────
export const WEIGHTS: Record<string, number> = {
    Common: 60,
    Uncommon: 25,
    Rare: 10,
    Epic: 3,
    Mythical: 1.5,
    Legendary: 0.4,
    Divine: 0.1,
    Celestial: 0.05,
    '???': 0.01,
}

// ─── leveling ─────────────────────────────────────────────────────────────────
export const MAX_CARD_LEVEL = 100

// xp gained when feeding a card of this rarity
export const RARITY_XP: Record<string, number> = {
    Common: 10,
    Uncommon: 20,
    Rare: 35,
    Epic: 55,
    Mythical: 80,
    Legendary: 120,
    Divine: 175,
    Celestial: 250,
    '???': 500,
}

// xp required to reach the next level
export function xpToNextLevel(rarity: string, level: number): number {
    const multipliers: Record<string, number> = {
        Common: 100,
        Uncommon: 100,
        Rare: 100,
        Epic: 20,
        Mythical: 20,
        Legendary: 20,
        Divine: 5,
        Celestial: 2,
        '???': 1,
    }
    return level * (multipliers[rarity] ?? 100)
}

// applies xp gain and handles multi-level-ups, capped at MAX_CARD_LEVEL
export function applyXP(
    currentLevel: number,
    currentXP: number,
    xpGained: number,
    rarity: string,
): { newLevel: number; newXP: number } {
    let level = currentLevel
    let xp = currentXP + xpGained

    while (level < MAX_CARD_LEVEL) {
        const threshold = xpToNextLevel(rarity, level)
        if (xp >= threshold) {
            xp -= threshold
            level++
        } else {
            break
        }
    }

    return { newLevel: level, newXP: xp }
}

// ─── buyback / coin economy ───────────────────────────────────────────────────
export const BUYBACK_RANGE: Record<string, [number, number]> = {
    Common: [3, 8],
    Uncommon: [10, 22],
    Rare: [28, 48],
    Epic: [60, 95],
    Mythical: [120, 190],
    Legendary: [320, 500],
    Divine: [750, 1100],
    Celestial: [1600, 2500],
    '???': [4000, 7000],
}

export const HOT_MARKET_CHANCE = 0.05 // 5% chance of hot market
export const HOT_MARKET_MULTIPLIER = 2 // 2x coins on hot market

// calculates a randomised buyback value with optional hot market bonus
export function calculateBuyback(rarity: string): {
    coins: number
    isHot: boolean
} {
    const range = BUYBACK_RANGE[rarity] ?? [3, 8]
    const base =
        Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
    const isHot = Math.random() < HOT_MARKET_CHANCE
    const coins = isHot ? Math.floor(base * HOT_MARKET_MULTIPLIER) : base
    return { coins, isHot }
}

// ─── gacha ────────────────────────────────────────────────────────────────────

// weighted random rarity pick
export function pickRarity(): string {
    const totalWeights = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
    let roll = Math.random() * totalWeights

    for (const [rarity, weight] of Object.entries(WEIGHTS)) {
        roll -= weight
        if (roll <= 0) return rarity
    }

    return 'Common'
}

// returns "1 / X (Y%)" odds string for a given rarity
export function rarityToOdds(rarity: string): string {
    const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
    const weight = WEIGHTS[rarity] ?? 60
    const pct = ((weight / totalWeight) * 100).toFixed(2)
    const rounded = Math.round(totalWeight / weight)
    return `1 / ${rounded.toLocaleString()} (${pct}%)`
}

// ─── helpers ──────────────────────────────────────────────────────────────────

export function isRainbow(rarity: Rarity | string): boolean {
    return RARITY_GLOW[rarity] === 'rainbow'
}

// ─── style helpers ────────────────────────────────────────────────────────────

// Returns the rgb string (e.g. "96, 165, 250") for a rarity's glow colour.
// For '???' / rainbow returns a purple fallback — pair with isRainbow() to
// apply the animated .glow-rainbow CSS class instead of a static colour.
export function rarityGlowRgb(rarity: string): string {
    const glow = RARITY_GLOW[rarity]
    if (!glow || glow === 'rainbow') return '168,85,247'
    return glow
}

export const RAINBOW_TEXT_STYLE: React.CSSProperties = {
    background:
        'linear-gradient(90deg,#f87171,#fb923c,#facc15,#4ade80,#60a5fa,#a855f7,#f472b4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
}

export function rarityTextStyle(rarity: string): React.CSSProperties {
    if (isRainbow(rarity as Rarity)) return RAINBOW_TEXT_STYLE
    if (rarity === 'Celestial') return { color: '#e8f4ff' }
    return { color: RARITY_COLOR[rarity as Rarity] ?? '#9ca3af' }
}

// returns a box-shadow string matching the rarity glow at the given intensity
export function rarityGlowShadow(
    rarity: Rarity | string,
    intensity: 'sm' | 'md' | 'lg' = 'md',
): string {
    if (isRainbow(rarity)) {
        const sizes = { sm: '6px 1px', md: '14px 3px', lg: '32px 8px' }
        return `0 0 ${sizes[intensity]} rgba(168,85,247,0.5)`
    }
    const rgb = RARITY_GLOW[rarity]
    const sizes = {
        sm: ['6px 1px', 0.25],
        md: ['14px 3px', 0.5],
        lg: ['32px 8px', 0.45],
    } as const
    const [size, alpha] = sizes[intensity]
    return `0 0 ${size} rgba(${rgb}, ${alpha})`
}
export function isFullArt(
    variants?: { holo?: boolean; normal?: boolean } | null,
): boolean {
    if (!variants) return false
    return variants.holo === true && variants.normal === false
}
