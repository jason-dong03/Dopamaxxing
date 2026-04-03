# Module 2: Meet the Cast

### Teaching Arc
- **Metaphor:** A film crew. You see the movie (the UI), but behind the scenes there's a director (the API routes), a props department (the database), a special effects team (PokeAPI/Groq), and a cashier (Stripe). Each has one job and never does someone else's.
- **Opening hook:** The app has 11 major "actors." Each one has exactly one job. When something breaks, knowing who owns what means you fix it in 5 minutes instead of 5 hours.
- **Key insight:** The architecture is split into three layers — Browser (React), Server (API routes), External (Supabase/PokeAPI/Stripe) — and data flows in one direction.
- **"Why should I care?":** When you're directing AI to add a feature, you need to know which "actor" is responsible. Adding a feature to the wrong layer creates bugs that are hard to find.

### Screens (5)

**Screen 1 — The Three Layers**
Visual layered diagram: Browser Layer (what users see) → Server Layer (the logic) → Data Layer (memory + external). Use architecture diagram with three zones.

**Screen 2 — The Browser Actors**
Cards for the 4 main React components:
- PackOpening.tsx — the card-reveal animation machine
- Bag.tsx — the card inventory grid
- NBattleScreen.tsx — the battle arena
- PackSelector.tsx — the pack-picking UI

Each card: icon + name + one-liner + "talks to:" arrow

**Screen 3 — The Server Actors (API Routes)**
Group chat animation: PackOpening.tsx asks the server for cards. The server checks auth, checks the database, calls PokeAPI, and sends cards back.

Actors in chat: PackOpening (browser), /api/open-pack (server), Supabase DB, PokeAPI

**Screen 4 — Code ↔ English: What "Auth" Actually Means**
Translation block from `app/api/open-pack/route.ts` lines 68-76:

```
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

English lines:
- "This function runs every time someone calls POST /api/open-pack"
- "Create a connection to the database with the user's login cookies"
- "Ask Supabase: 'Who sent this request? Are they logged in?'"
- "Get the user object back — name, ID, email"
- "If nobody is logged in — stop here and send back 'Unauthorized'"
- "401 is the universal code for 'you need to log in first'"

**Screen 5 — Quiz**
3 questions testing understanding of who owns what.

### Interactive Elements
- [x] **Group chat animation** — actors: PackOpening (browser), API Route, Supabase, PokeAPI. Messages: "I need 5 cards for set sv02" → "Hold on, checking your identity..." → "Confirmed. How many cards in your bag?" → "You have 23. Fetching card pool..." → "Got the pool. Fetching Pokémon stats from PokeAPI..." → "Stats ready. Here are your 5 cards!" → "Playing the animation now 🎴"
- [x] **Code↔English translation** — auth check snippet above
- [x] **Architecture diagram** — three zones: Browser / Server / External. Components clickable with descriptions.
- [x] **Pattern cards** — the four browser actors
- [x] **Quiz** — 3 scenario/architecture questions

### Quiz Questions
Q1 (architecture): "You want to add a feature that shows the user their total pack-opening count on the dashboard. The count is already stored in `profiles.packs_opened`. Where does the logic to *display* it live vs. the logic to *increment* it?" → A) Display AND increment both in the browser B) Display in browser, increment in API route C) Both in the API route D) Display in API route, increment in browser. Correct: B. Display is a browser concern (show data to the user); incrementing is a server concern (trust nobody's math but the server's).

Q2 (debugging): "A user can open packs fine on the website, but your Discord bot can't award packs to users. The bot calls `/api/admin/users/gift-pack`. What is the most likely cause?" → A) The database is down B) The bot is not authenticated as a user C) The React component is broken D) PokeAPI is rate-limited. Correct: B. Every API route checks auth — the Discord bot needs its own credentials.

Q3 (steering AI): "You want AI to add a 'sell all common cards at once' button. Which files need to change?" → A) Only Bag.tsx B) Only app/api/batch-action/route.ts C) Bag.tsx (new button) + app/api/batch-action/route.ts (new logic) D) lib/rarityConfig.ts. Correct: C. UI change = browser file. Logic/database change = API route.

### Reference Files
- `references/interactive-elements.md` → "Group Chat Animation", "Interactive Architecture Diagram", "Pattern/Feature Cards", "Multiple-Choice Quizzes", "Code ↔ English Translation Blocks"
- `references/content-philosophy.md` → all
- `references/gotchas.md` → all

### Connections
- **Previous module:** "The Dopamine Machine" — traced the pack-opening journey end to end
- **Next module:** "Odds, Fate & Fortune" — now we zoom into the probability engine inside the server
- **Tone:** Warm but precise. Module uses `--color-bg-warm` (alternating). Module id: `module-2`.
