# Module 4: Talking to the Outside World

### Teaching Arc
- **Metaphor:** A contractor hiring subcontractors. You're building a house (the app), but you don't manufacture your own windows (Pokémon stats), wire your own electricity (payments), or pour your own concrete (database). You hire specialists — and you communicate with them through formal contracts called APIs.
- **Opening hook:** When your card shows "ATK: 84 / DEF: 62," those numbers didn't come from your database. They came from a free Pokémon data service in New Zealand, got classified by an AI in San Francisco, and landed in your card in under 2 seconds.
- **Key insight:** APIs are just standardized ways to ask another computer for help — and most real apps are just clever orchestrations of a dozen such conversations happening in parallel.
- **"Why should I care?":** Every modern app uses external APIs. Understanding how they work means you can add new ones, debug failures, reason about costs, and know when you're about to hit a rate limit.

### Screens (5)

**Screen 1 — The Four Outside Services**
Pattern cards for all 4 external services:
- PokeAPI — Free Pokémon stats & moves. No key needed. 24h cache.
- Groq (LLM) — AI classifies move effects (heal%, status, priority). llama-3.1-8b-instant.
- Supabase — The database + auth. PostgreSQL in the cloud.
- Stripe — Takes real money and gives in-game coins.

**Screen 2 — PokeAPI: The Stats Pipeline**
Group chat animation showing: Card is pulled → fetchPokemonData(151) called → PokeAPI returns base stats → rollStats() multiplies by rarity → card gets real Charizard stats.

Actors: open-pack API, PokeAPI, lib/pokemon-stats.ts

Code ↔ English: `lib/pokemon-stats.ts` rollStats function — show how base stats × rarity multiplier × ±15% variance = final stat.

Snippet from `lib/pokemon-stats.ts` (the rollStats function, ~8 lines):
```
export function rollStats(rarity: string, baseStats?: BaseStats): CardStats {
    const mult = RARITY_STAT_MULTIPLIER[rarity] ?? 1.0
    const variance = () => 0.85 + Math.random() * 0.3   // ±15%

    return {
        stat_atk:      Math.round((baseStats?.attack      ?? randBase()) * mult * variance()),
        stat_def:      Math.round((baseStats?.defense     ?? randBase()) * mult * variance()),
        stat_spatk:    Math.round((baseStats?.specialAtk  ?? randBase()) * mult * variance()),
        stat_spdef:    Math.round((baseStats?.specialDef  ?? randBase()) * mult * variance()),
        stat_spd:      Math.round((baseStats?.speed       ?? randBase()) * mult * variance()),
        stat_accuracy: Math.round(75 * mult * variance()),
        stat_evasion:  Math.round(75 * mult * variance()),
    }
}
```

English:
- "Get the rarity multiplier — Celestial cards are 2.8× stronger than Common"
- "Create a random variance function: anywhere from 0.85 to 1.15 (±15%)"
- "Attack stat = real Pikachu base attack × rarity boost × random variance"
- "If PokeAPI didn't respond, use a random base stat instead (fallback)"
- "Round to a whole number — no decimals in battle"
- "Same formula for all 7 stats"

**Screen 3 — Groq: When AI Classifies Moves**
Visual showing: card's Pokémon learns "Flamethrower" → fetch move data from PokeAPI → send effect text to Groq LLM → LLM returns JSON → move gets `power: 90, type: "fire", burn_chance: 10`

Callout: "This is AI being used as a *data transformation tool*, not a chat assistant. You give it messy text ('May burn the target'), it gives you structured data ({burn_chance: 10}). This use of LLMs is often called 'data extraction' or 'structured output generation.'"

**Screen 4 — Supabase: Your App's Memory**
Show the key tables and how they connect:
- `profiles` → one row per user, stores coins/xp/level
- `user_cards` → one row per card owned, stores stats/moves/worth
- `cards` → the card catalog (read-only, shared by everyone)
- `n_battles` → active battle state

Visual showing the relationships with arrows. Callout: "Supabase is just PostgreSQL — a 50-year-old type of database that stores everything in tables with rows and columns, like an extremely reliable Excel sheet. 'The cloud' just means it runs on someone else's computer."

**Screen 5 — Quiz**
3 questions on external API understanding.

### Interactive Elements
- [x] **Group chat animation** — open-pack API, PokeAPI, Groq, result. Messages showing the move classification pipeline.
- [x] **Code↔English translation** — rollStats snippet
- [x] **Pattern cards** — 4 external services
- [x] **Callout boxes** — Groq as data extractor + Supabase as PostgreSQL
- [x] **Quiz** — 3 questions

### Quiz Questions
Q1 (debugging): "PokeAPI goes down for maintenance. What happens to your app?" → A) The whole app crashes B) Pack opening crashes completely C) Pack opening still works but cards get rarity-based random stats instead of real Pokémon stats D) Users lose their cards. Correct: C. The code has a fallback: `baseStats?.attack ?? randBase()` — if PokeAPI fails, it uses random numbers instead.

Q2 (cost reasoning): "You're planning to open a pack with 100 cards (for a special event). The Groq AI call happens once per *move* per card, and each card has 4 moves. How many AI calls would one 100-card pack make?" → A) 1 B) 100 C) Up to 400 D) None — Groq is only called during grading. Correct: C. 100 cards × 4 moves = up to 400 Groq calls. Important to know when estimating API costs.

Q3 (architecture): "You want to let users import their real Pokémon game save file to auto-unlock certain cards. Where in the system would you add this logic?" → A) In PackOpening.tsx (browser component) B) In a new API route, e.g. /api/import-save C) In lib/rarityConfig.ts D) In the Supabase database directly. Correct: B. New functionality that touches the database and needs auth = new API route.

### Reference Files
- `references/interactive-elements.md` → "Group Chat Animation", "Code ↔ English Translation Blocks", "Pattern/Feature Cards", "Callout Boxes", "Multiple-Choice Quizzes"
- `references/content-philosophy.md` → all
- `references/gotchas.md` → all

### Connections
- **Previous module:** "Odds, Fate & Fortune" — the internal probability engine
- **Next module:** "Cards That Fight Back" — the battle system
- **Tone:** Slightly technical but demystifying. Module uses `--color-bg-warm`. Module id: `module-4`.
