export const RARITY_GLOW: Record<string, string> = {
    Common: '156, 163, 175',
    Uncommon: '74, 222, 128',
    Rare: '96, 165, 250',
    Epic: '168, 85, 247',
    Mythical: '220, 38, 38',
    Legendary: '234, 179, 8',
    Divine: '244, 114, 182',
    Celestial: '15, 15, 15',
    '???': 'rainbow',
}

export const MAX_CARD_LEVEL = 100

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
