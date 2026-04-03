# Module 3: Odds, Fate & Fortune

### Teaching Arc
- **Metaphor:** A weighted lottery ticket machine — most tickets are common (blue), some are rare (gold), and every 50 pulls without a jackpot, the machine secretly swaps in a guaranteed jackpot ticket. The machine itself decides your fate, not luck alone.
- **Opening hook:** That moment you pulled a Legendary card? It wasn't pure luck. The code ran through a weighted coin flip, a mercy system, a condition roll, and a market price calculation — all in under 50 milliseconds.
- **Key insight:** Randomness in games is never *truly* random — it's carefully designed probability with safety nets built in.
- **"Why should I care?":** Understanding the probability engine means you can tune it — make the game more generous, add new rarities, or build your own economy from scratch.

### Screens (5)

**Screen 1 — The Rarity Ladder**
Visual card showing all 9 rarities from Common to ??? with their weights displayed as a bar chart. Show actual pull percentages.

Rarities (from lib/rarityConfig.ts WEIGHTS object, approximate):
Common ~57%, Uncommon ~25%, Rare ~11%, Epic ~4.5%, Mythical ~1.5%, Legendary ~0.6%, Divine ~0.2%, Celestial ~0.05%, ??? ~0.02%

**Screen 2 — How the Slot Machine Works**
Code ↔ English: the rarity-picking function.

Snippet from `lib/rarityConfig.ts` lines ~325-335 (the `pickRarity` / `pickRarityFromWeights` function):

```
export function pickRarityFromWeights(weights: Record<string, number>): string {
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    let roll = Math.random() * total

    for (const [rarity, weight] of Object.entries(weights)) {
        roll -= weight
        if (roll <= 0) return rarity
    }

    return 'Common'
}
```

English lines:
- "This function picks a rarity using a weighted lottery"
- "Add up all the weights to know the total 'size' of the lottery"
- "Roll a random number anywhere in that range"
- "Walk through each rarity, subtracting its weight from the roll"
- "The moment roll hits zero or below — that rarity wins"
- "Fallback: if nothing matches (floating point edge case), give Common"

**Screen 3 — The Pity System**
Visual timeline showing: 10 packs opened → counter at 10 → 40 more without Legendary → counter hits 50 → next pack GUARANTEED to upgrade. Show the pity counter reset on hit.

Explain `pity_counter` and `pity_threshold` stored on the user's profile.

Callout box: "This pattern — 'guaranteed reward after N attempts' — is used by nearly every gacha game. It's called a 'soft pity' system and it exists because humans have a visceral negative reaction to feeling cheated by pure RNG."

**Screen 4 — Your Card's Condition**
Pattern cards for the 4 condition attributes:
- Centering (25% weight) — how well-centered the image is
- Corners (30% weight) — corner sharpness
- Edges (25% weight) — edge condition
- Surface (20% weight) — surface scratches

Show how weighted average → grade (1–10) → multiplier on sell price (1.0 = 0.15x, 10.0 = 2.5x).

Callout: "This mirrors real PSA card grading — the same four dimensions they use on physical cards. It makes the virtual cards feel like real collectibles with genuine quality variance."

**Screen 5 — Quiz**
3 questions testing probability intuition and debugging.

### Interactive Elements
- [x] **Code↔English translation** — pickRarityFromWeights snippet
- [x] **Callout boxes** — pity system pattern + PSA grading parallel (max 2)
- [x] **Pattern cards** — 4 condition attributes
- [x] **Data flow animation** — show card going through rarity roll → condition roll → worth calculation. Actors: RNG Engine, Rarity Table, Condition Roller, Worth Calculator. Steps: "Pack slot 5 needs a card" → "Roll weighted lottery (result: Epic)" → "Pick random Epic card from pool" → "Roll 4 condition attributes" → "Calculate weighted grade: 7.2" → "Apply buyback: $4.20 × 0.65 × 1.25 = $3.41"
- [x] **Quiz** — 3 questions

### Quiz Questions
Q1 (architecture decision): "You want to make Divine cards 3x more common during a weekend event. Where in the code would you make this change?" → A) In the database (change a card's rarity field) B) In `getEventMagnitude()` + the luckBoost multiplier in open-pack C) In PackOpening.tsx (the animation file) D) In lib/packs.ts. Correct: B. The event system already has a `luckBoost` multiplier that scales rare+ weights — that's the right lever.

Q2 (debugging): "A user complains they've opened 100 packs without a Legendary. You look at their profile and see `pity_counter: 12`. What most likely happened?" → A) The pity system is broken B) They DID pull a Legendary recently — the counter reset to 0 when it happened, and is now at 12 C) The pity threshold is set too high D) The database is not saving. Correct: B. pity_counter resets to 0 on a hit, then counts up from there. 12 means they pulled Legendary ~88 packs ago and have 38 packs to go.

Q3 (scenario): "You want to add a new 'Prismatic' rarity above Celestial with a 0.005% pull rate. Which files need changes?" → A) Only lib/rarityConfig.ts B) lib/rarityConfig.ts (add weight + color) + app/api/open-pack/route.ts (add to pity rarities) + the database (add to rarity enum) C) Only the database D) Only PackOpening.tsx. Correct: B. Rarity is defined in rarityConfig, used in the API route, and stored in the DB.

### Reference Files
- `references/interactive-elements.md` → "Message Flow / Data Flow Animation", "Code ↔ English Translation Blocks", "Pattern/Feature Cards", "Multiple-Choice Quizzes", "Callout Boxes"
- `references/content-philosophy.md` → all
- `references/gotchas.md` → all

### Connections
- **Previous module:** "Meet the Cast" — learned who the actors are
- **Next module:** "Talking to the Outside World" — now we look at external APIs (PokeAPI, Groq, Stripe)
- **Tone:** Slightly playful — this is the fun math. Module uses `--color-bg` (off-white). Module id: `module-3`.
