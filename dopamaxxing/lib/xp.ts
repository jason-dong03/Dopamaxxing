/** XP required to advance FROM a given level to the next */
export function xpForLevel(level: number): number {
    return level * 100
}

/** Minimal XP awarded for opening a pack */
export const XP_PER_PACK = 15

/**
 * Apply gained XP, handling multi-level-ups.
 * Returns the new { xp, level } to persist.
 */
export function applyXP(
    currentXp: number,
    currentLevel: number,
    gained: number,
): { xp: number; level: number } {
    let xp = currentXp + gained
    let level = currentLevel

    while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level)
        level += 1
    }

    return { xp, level }
}
