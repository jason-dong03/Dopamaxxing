# Module 1: The Dopamine Machine

### Teaching Arc
- **Metaphor:** A vending machine — you put in money, hear the mechanical whirr, and something falls out. Except this vending machine takes 300ms and the "whirr" is five different computers talking to each other.
- **Opening hook:** Every time you tap "Open Pack," about six things happen simultaneously on three different computers — and it all completes before you've finished blinking.
- **Key insight:** The whole app is one big request-response loop: the browser asks, the server decides, the database remembers.
- **"Why should I care?":** Understanding this end-to-end journey means you can tell AI *exactly* which part of the system needs changing when something breaks.

### Screens (4)

**Screen 1 — "What Is This App?"**
Introduce Dopamaxxing in plain English: a Pokémon card gacha game built with AI. Users open packs of virtual cards, build collections, sell duplicates for coins, and battle other trainers. The excitement of pulling a rare card — recreated in code.

Cards: What it does / What makes it interesting engineering / What you'll learn

**Screen 2 — The Moment of the Click**
Trace exactly what happens when you tap "Open Pack." Use the data flow animation to walk through: Browser → API Server → Database → PokeAPI → Back to Browser.

Show the 7 steps numbered.

**Screen 3 — Code ↔ English: The Pack Request**
Translation block using this snippet from `app/api/open-pack/route.ts` lines 86-109:

```
const [{ data: profile }, allCards, bagCountRes] = await Promise.all([
    supabase
        .from('profiles')
        .select('pity_counter, pity_threshold, coins, xp, level, bag_capacity, daily_packs_today, daily_reset_date, packs_opened')
        .eq('id', user.id)
        .single(),
    packDef?.theme_pokedex_ids
        ? getCardsForPokedexIds(supabase, setId, packDef.theme_pokedex_ids)
        : getCardsForSet(supabase, setId),
    supabase
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
])

const bagCapacity = profile?.bag_capacity ?? 50
const bagCount = bagCountRes.count ?? 0
if (bagCount >= bagCapacity) {
    return NextResponse.json(
        { error: 'bag_full', bagCount, bagCapacity },
        { status: 409 },
    )
}
```

English lines:
- "Do three database lookups at the exact same time (parallel = faster)"
- "Get the user's profile: coins, pack count, bag size limit"
- "Fetch every card available in this pack's set"
- "Count how many cards are currently in the bag"
- "If the bag is full — stop immediately and send back an error"
- "Error code 409 means 'conflict' — there's no room"

**Screen 4 — Quiz**
3 scenario questions testing understanding of the end-to-end flow.

### Interactive Elements
- [x] **Data flow animation** — actors: Browser, API Server, Database, PokeAPI. Steps: user clicks → request sent → auth check → three parallel DB calls → card selection → PokeAPI fetch → insert cards → coins deducted → cards returned → animation plays
- [x] **Code↔English translation** — the pack opening parallel fetch snippet above
- [x] **Quiz** — 3 scenario questions (see below)
- [x] **Callout box** — "Why parallel? Because sequential would be 3x slower — this is the single most common performance trick in backend code."
- [x] **Numbered step cards** — the 7 steps of opening a pack

### Quiz Questions
Q1 (debugging): "A user reports that after opening a pack, their card appeared but their coins didn't go down. Which part of the system would you look at first?" → A) The frontend animation B) The database profile update C) The PokeAPI D) The browser cache. Correct: B. Explanation: coins are stored in the `profiles` table and updated in `open-pack/route.ts` — if they didn't decrease, the profile update failed.

Q2 (architecture): "The app checks three things before giving you a card — your coins, your bag space, and what cards are available. Why does it check these on the *server* instead of in the *browser*?" → A) The browser is too slow B) Users could fake the checks in the browser C) The database is only accessible from the server D) JavaScript can't do math. Correct: B. "Never trust the client" — the server is the single source of truth.

Q3 (tracing): "You want to add a 'double XP weekend' feature where packs give 2× profile XP. Which file would you change?" → A) components/PackOpening.tsx B) lib/rarityConfig.ts C) app/api/open-pack/route.ts D) lib/packs.ts. Correct: C. The XP update happens inside the open-pack API route.

### Reference Files
- `references/interactive-elements.md` → "Message Flow / Data Flow Animation", "Multiple-Choice Quizzes", "Code ↔ English Translation Blocks", "Numbered Step Cards", "Callout Boxes"
- `references/content-philosophy.md` → all
- `references/gotchas.md` → all

### Connections
- **Previous module:** None — this is the opener
- **Next module:** "Meet the Cast" — now that we know the journey, we meet the individual actors in detail
- **Tone:** Warm, like a behind-the-scenes documentary. Accent color: amber/gold (#D4A843). Module uses `--color-bg` (off-white). Module id: `module-1`.
