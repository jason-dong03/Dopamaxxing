// lib/autoCompletePref.ts

export type CardAction = 'add' | 'feed' | 'sell' | 'skip'

export type AutoCompletePrefs = {
    bulk: CardAction
    fullArt: Record<string, CardAction> // keyed by rarity
}

const STORAGE_KEY = 'dopamaxxing_autocomplete_prefs'

export const DEFAULT_PREFS: AutoCompletePrefs = {
    bulk: 'sell',
    fullArt: {
        Uncommon: 'add',
        Rare: 'add',
        Epic: 'add',
        Mythical: 'add',
        Legendary: 'add',
        Divine: 'add',
        Celestial: 'add',
        '???': 'add',
    },
}

export function loadPrefs(): AutoCompletePrefs {
    if (typeof window === 'undefined') return DEFAULT_PREFS
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : DEFAULT_PREFS
    } catch {
        return DEFAULT_PREFS
    }
}

export function savePrefs(prefs: AutoCompletePrefs): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export const PREMIUM_RARITIES = new Set([
    'Rare',
    'Epic',
    'Mythical',
    'Legendary',
    'Divine',
    'Celestial',
    '???',
])

export function getActionForCard(
    card: { rarity: string },
    prefs: AutoCompletePrefs,
    isNew: boolean,
): CardAction {
    const isBulk = card.rarity === 'Common'
    const action = isBulk ? prefs.bulk : (prefs.fullArt[card.rarity] ?? 'skip')

    if (action === 'feed' && isNew) return 'add'
    if (action === 'add' && !isNew) return 'feed'
    return action
}
