# Module 5: Cards That Fight Back

### Teaching Arc
- **Metaphor:** A chess clock meets a physics engine. Each "turn" is a negotiation: who goes first (speed), how hard do you hit (stats × type), what side effects trigger (status conditions). The "physics" are encoded in a lookup table that every game designer calls a "type chart."
- **Opening hook:** The battle screen looks like a Pokémon game — and that's intentional. Under the hood, it uses the same damage formula Nintendo published in 1996, reimplemented in TypeScript.
- **Key insight:** A complex interactive system like a battle game is just a *state machine* — a box of variables that update according to rules. The `n_battles` database row IS the game state.
- **"Why should I care?":** State machines are everywhere — checkout flows, onboarding wizards, multi-step forms. Understanding how battles work teaches you how to build any multi-step interactive feature.

### Screens (5)

**Screen 1 — The Battle as a State Machine**
Visual diagram showing battle phases:
pre-dialogue → team-reveal → card-select → battle (loop) → won/lost

Each phase is a `BattlePhase` string. Show the transition rules between them.

Callout: "A 'state machine' is just a fancy name for code that knows what mode it's in and what's allowed to happen next. Your checkout flow (cart → payment → confirmation) is a state machine. Traffic lights are state machines."

**Screen 2 — The Damage Formula**
Show how a single attack calculates damage.

Code ↔ English: the damage calculation from `lib/n-battle.ts`:
```
export function calculateDamage(
    attacker: BattleCard,
    move: Attack,
    defender: BattleCard,
): number {
    const base = move.damage ?? 0
    const typeBonus = getTypeEffectiveness(move.type, defender.pokemon_type ?? 'Normal')
    const statBonus = move.damage_class === 'special'
        ? attacker.stat_spatk / 100
        : attacker.stat_atk / 100
    const defMult = move.damage_class === 'special'
        ? 1 - (defender.stat_spdef / 300)
        : 1 - (defender.stat_def / 300)
    const crit = Math.random() < 0.0625 ? 1.5 : 1
    return Math.max(1, Math.round(base * typeBonus * statBonus * defMult * crit))
}
```

English:
- "Get the base power of the move (e.g., Flamethrower = 90)"
- "Look up the type matchup — Fire vs Grass = 2.0× damage"
- "Add a stat bonus: special moves use SpATK, physical moves use ATK"
- "Defender's defense reduces damage — higher DEF = less damage taken"
- "6.25% chance of a critical hit: 1.5× damage"
- "Final damage is at least 1 — you can never deal 0 damage"

**Screen 3 — Type Effectiveness: The Rock-Paper-Scissors Chart**
Visual 5×5 grid showing key type matchups (Fire, Water, Grass, Electric, Psychic). Show Super Effective (2×), Not Very Effective (0.5×), Immune (0×). Clickable cells that show the relationship.

Pattern cards for the 5 status conditions:
- Burn 🔥 — deals damage each turn, -ATK
- Paralysis ⚡ — 25% chance of missing turn
- Poison ☠️ — deals damage each turn
- Sleep 💤 — skip turn until wake
- Confusion 🌀 — chance to hit yourself

**Screen 4 — The useBattle Hook: One File to Rule Them All**
Code ↔ English showing the hook's return signature from `hooks/useBattle.ts`:
```
export function useBattle(onClose: () => void) {
    const [phase, setPhase] = useState<BattlePhase>('pre-dialogue')
    const [battle, setBattle] = useState<BattleState | null>(null)
    const [acting, setActing] = useState(false)

    // ... all battle state lives here ...

    return {
        phase, battle, acting, battleMenu,
        cards, selected, loadingCards,
        doAttack, doSwitch, retry,
        // ...
    }
}
```

English:
- "useBattle is a 'custom hook' — a reusable bundle of related state and logic"
- "phase tracks which screen we're on: pre-dialogue, team-reveal, battle, etc."
- "battle holds the full game state synced from the database"
- "acting prevents double-clicks while waiting for the server"
- "Return everything the battle screen needs to render and respond to input"

Callout: "This pattern — putting all state in a hook and passing it to dumb display components — is called 'lifting state up.' The battle screen itself just displays what the hook tells it. This makes the whole system testable and reusable."

**Screen 5 — Quiz**
3 questions on state machines, battle logic, and debugging.

### Interactive Elements
- [x] **Group chat animation** — player clicks "Flamethrower", NBattleScreen calls /api/n-battle/action, server calculates damage, updates n_battles row, returns new state, component re-renders. Actors: NBattleScreen, /api/n-battle/action, Supabase n_battles, NBattleScreen (updated).
- [x] **Code↔English translation** — calculateDamage function
- [x] **Callout boxes** — state machine definition + lifting state up
- [x] **Pattern cards** — 5 status conditions
- [x] **Quiz** — 3 questions

### Quiz Questions
Q1 (state machine): "A user reports the battle screen is stuck showing 'Your turn' even after they attacked. What is the most likely bug?" → A) The type effectiveness chart is wrong B) `acting` state got stuck as `true` after the API call failed, so the UI thinks it's still waiting C) The Pokémon sprite didn't load D) The move has 0 power. Correct: B. `acting = true` disables the attack buttons to prevent double-clicks — if the API call fails without resetting it to false, the UI freezes.

Q2 (tracing): "You want to add a 'Mega Evolution' feature where a card gets 2× stats for 3 turns. Which parts of the system need to change?" → A) Only the battle UI (NBattleScreen.tsx) B) Only the database (add a mega_turns column to n_battles) C) lib/n-battle.ts (new mechanic) + app/api/n-battle/action (apply it per turn) + n_battles DB (track turns remaining) D) Only lib/rarityConfig.ts. Correct: C. New game mechanic = new logic in the battle lib + API route + database state.

Q3 (architecture): "The battle currently only has one opponent: Trainer N. You want to add a second opponent, Trainer Red, with a different team and dialogue. The least amount of code to change would be..." → A) Rewrite NBattleScreen.tsx from scratch B) Add Red's data to the content files and trainer config — the useBattle hook and API routes are already generic enough C) Duplicate all of NBattleScreen.tsx into a new file D) Change lib/rarityConfig.ts. Correct: B. The useBattle hook and API routes are opponent-agnostic — you just need new content (dialogue, team) in the content folder.

### Reference Files
- `references/interactive-elements.md` → "Group Chat Animation", "Code ↔ English Translation Blocks", "Pattern/Feature Cards", "Callout Boxes", "Multiple-Choice Quizzes"
- `references/content-philosophy.md` → all
- `references/gotchas.md` → all

### Connections
- **Previous module:** "Talking to the Outside World" — external APIs
- **Next module:** None — this is the finale
- **Tone:** Exciting and game-like. Module uses `--color-bg` (off-white). Module id: `module-5`.
