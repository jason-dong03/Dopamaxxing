import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { BattleCard } from '@/lib/n-battle'
import { getTypeEffectiveness } from '@/lib/n-battle'

export async function POST(request: NextRequest) {
    const { battleId } = await request.json()
    if (!battleId) return NextResponse.json({ ok: false })

    const supabase = await createClient()
    const { data: battle } = await supabase
        .from('n_battles')
        .select('*')
        .eq('id', battleId)
        .single()

    if (!battle || battle.status !== 'active') return NextResponse.json({ ok: false })

    const nActive: BattleCard    = battle.n_cards[battle.n_active_index]
    const nCards:  BattleCard[]  = battle.n_cards
    const nIdx:    number        = battle.n_active_index
    const userActive: BattleCard = battle.user_cards[battle.user_active_index]

    const nHpPct   = Math.round((nActive.hp / nActive.maxHp) * 100)
    const uHpPct   = Math.round((userActive.hp / userActive.maxHp) * 100)
    const nAtkStage = (nActive as any).attackStage  ?? 0
    const nDefStage = (nActive as any).defenseStage ?? 0
    const nSpdStage = (nActive as any).speedStage   ?? 0
    const uAtkStage = (userActive as any).attackStage  ?? 0
    const uDefStage = (userActive as any).defenseStage ?? 0
    const uSpdStage = (userActive as any).speedStage   ?? 0

    // ── Analyse battle log ────────────────────────────────────────────────────
    const battleLog: any[] = battle.battle_log ?? []

    // Last move N used
    const lastNEntry = [...battleLog].reverse().find(e => e.actor === 'n' && e.attackName !== 'Status')
    const lastNMoveName: string | null = lastNEntry?.attackName ?? null
    const lastNMoveIndex: number = lastNMoveName != null
        ? (nActive.attacks as any[]).findIndex((a: any) => a.name === lastNMoveName)
        : -1

    // Miss counts per move (last 6 turns of N's attacks)
    const recentNMoves = battleLog.filter(e => e.actor === 'n' && e.attackName !== 'Status').slice(-6)
    const missCount: Record<string, number> = {}
    for (const entry of recentNMoves) {
        if (entry.missed) missCount[entry.attackName] = (missCount[entry.attackName] ?? 0) + 1
    }
    // Flag moves that have missed 2+ times recently
    const unreliableMoves = new Set(
        Object.entries(missCount).filter(([, c]) => c >= 2).map(([name]) => name)
    )

    // ── Type-advantage switch logic ───────────────────────────────────────────
    // Check if there's a better N card to bring in against the current foe
    const userType = userActive.pokemon_type ?? 'normal'
    const currentTypeEff = getTypeEffectiveness(nActive.pokemon_type ?? 'normal', userType)

    // Find alive N cards (not current, hp > 0) with better type matchup
    const betterSwitch = nCards
        .map((card, i) => ({ card, i }))
        .filter(({ card, i }) => i !== nIdx && card.hp > 0)
        .find(({ card }) => {
            const eff = getTypeEffectiveness(card.pokemon_type ?? 'normal', userType)
            // Switch if: current is at 0.5x or worse AND candidate is at least neutral (1x)
            // Also switch if current is taking 2x damage from foe and candidate takes less
            const foeEffOnCurrent  = getTypeEffectiveness(userType, nActive.pokemon_type ?? 'normal')
            const foeEffOnCandidate = getTypeEffectiveness(userType, card.pokemon_type ?? 'normal')
            const offensivelyBetter = eff >= currentTypeEff * 1.5
            const defensivelyBetter = foeEffOnCandidate < foeEffOnCurrent && foeEffOnCurrent >= 2
            return offensivelyBetter || defensivelyBetter
        })

    // Switch condition: current N card is at a severe disadvantage AND switch candidate exists
    // Don't switch if: N is at low HP (might as well use remaining PP), or already winning
    const shouldConsiderSwitch =
        betterSwitch !== undefined &&
        nHpPct > 30 &&
        uHpPct > 40 &&
        (currentTypeEff <= 0.5 || getTypeEffectiveness(userType, nActive.pokemon_type ?? 'normal') >= 2)

    if (shouldConsiderSwitch && betterSwitch) {
        await supabase
            .from('n_battles')
            .update({ n_next_move: { switch: true, switchTo: betterSwitch.i } })
            .eq('id', battleId)
        return NextResponse.json({ ok: true, switch: true, switchTo: betterSwitch.i })
    }

    // ── Hard-filter useless/unreliable moves before sending to LLM ───────────
    const stageKey = (stat: string) =>
        stat === 'attack' ? nAtkStage : stat === 'defense' ? nDefStage : nSpdStage
    const foeStageKey = (stat: string) =>
        stat === 'attack' ? uAtkStage : stat === 'defense' ? uDefStage : uSpdStage

    const nPpArr: number[] = (nActive as any).currentPp ?? (nActive.attacks as any[]).map((a: any) => a.maxPp ?? 30)

    const availableMoves = (nActive.attacks as any[])
        .map((a, i) => ({ a, i }))
        .filter(({ a, i }) => {
            if ((nPpArr[i] ?? 0) <= 0) return false
            // Filter out self-buff moves where ALL boosted stats are already maxed (+6)
            if (a.selfBoosts) {
                const allMaxed = (a.selfBoosts as any[]).every((b: any) => stageKey(b.stat) >= 6)
                if (allMaxed) return false
            }
            // Filter out enemy-debuff moves where ALL dropped stats are already at floor (-6)
            if (a.enemyDrops && !a.damage) {
                const allFloored = (a.enemyDrops as any[]).every((b: any) => foeStageKey(b.stat) <= -6)
                if (allFloored) return false
            }
            // Filter out moves that have missed 2+ times recently (unless it's the only move)
            if (unreliableMoves.has(a.name)) return false
            return true
        })

    // Fallback: if filtering removed everything, allow all moves with PP (ignore unreliable filter)
    const movesToUse = availableMoves.length > 0
        ? availableMoves
        : (nActive.attacks as any[]).map((a, i) => ({ a, i })).filter(({ i }) => (nPpArr[i] ?? 0) > 0)

    const attackList = movesToUse
        .map(({ a, i }) => {
            const tags: string[] = []
            if (a.healFraction)   tags.push(`heals ${Math.round(a.healFraction * 100)}% HP`)
            if (a.selfBoosts) {
                const boosts = (a.selfBoosts as any[]).map((b: any) => `${b.stat}+${b.stages} (cur:${stageKey(b.stat)})`).join(',')
                tags.push(`self: ${boosts}`)
            }
            if (a.enemyDrops)     tags.push(`foe: ${(a.enemyDrops as any[]).map((b: any) => `${b.stat}${b.stages} (cur:${foeStageKey(b.stat)})`).join(',')}`)
            if (a.statusInflict)  tags.push(`inflicts ${a.statusInflict}${a.alwaysInflict ? ' (100%)' : ' (40%)'}`)
            if (a.priority > 0)   tags.push(`priority+${a.priority}`)
            if (a.selfDamage)     tags.push(`recoil ${a.selfDamage}`)
            const extra = tags.length ? ` [${tags.join(', ')}]` : ''
            return `${i}: ${a.name} — dmg:${a.damage ?? 0} type:${a.attackType ?? '?'} — ${a.effect}${extra}`
        })
        .join('\n')

    // Type effectiveness context for LLM
    const nVsUserEff = getTypeEffectiveness(nActive.pokemon_type ?? 'normal', userType)
    const userVsNEff = getTypeEffectiveness(userType, nActive.pokemon_type ?? 'normal')
    const typeCtx = `Type matchup: N's ${nActive.pokemon_type} vs foe's ${userType} — N deals ×${nVsUserEff}, N takes ×${userVsNEff}`

    let moveIndex = movesToUse[0]?.i ?? 0

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `You are N from Pokémon Black/White — a cold, tactical battler who treats Pokémon as partners. Choose the best move index using real competitive strategy:
- Use status moves (paralysis/poison/burn/sleep) when the foe has no status condition yet
- Use self-buff moves (selfBoosts tag) when HP > 50% AND the relevant stat stage is below +3
- Use enemy-debuff moves (enemyDrops tag) when the foe's relevant stat stage is above -3 and you are not at risk of fainting this turn
- Use healing moves when your HP is below 40%
- Use your strongest attacking move when you already have a relevant stat boost (+2 or more)
- Use priority moves when the foe is at low HP and a normal move might not land first
- NEVER use a self-buff move if the relevant stat stage is already at +4 or higher
- NEVER use a debuff move if the foe's relevant stat stage is already at -4 or lower
- Consider type effectiveness — prefer moves that hit the foe for super effective damage
- The move list only includes moves that are currently legal (have PP, not recently spamming misses, not redundant)
Reply with ONLY a single digit (the move index).`,
                },
                {
                    role: 'user',
                    content: [
                        `N's active: ${nActive.name} | HP: ${nActive.hp}/${nActive.maxHp} (${nHpPct}%) | status: ${nActive.statusEffect} | type: ${nActive.pokemon_type}`,
                        `N's stat stages — ATK:${nAtkStage} DEF:${nDefStage} SPD:${nSpdStage}`,
                        ``,
                        `Foe: ${userActive.name} | HP: ${userActive.hp}/${userActive.maxHp} (${uHpPct}%) | status: ${userActive.statusEffect} | type: ${userActive.pokemon_type}`,
                        `Foe stat stages — ATK:${uAtkStage} DEF:${uDefStage} SPD:${uSpdStage}`,
                        typeCtx,
                        ``,
                        `Moves:\n${attackList}`,
                        ``,
                        lastNMoveName ? `Last move used: ${lastNMoveName} (index ${lastNMoveIndex}) — avoid repeating unless clearly optimal.` : '',
                        unreliableMoves.size > 0 ? `Moves excluded (missed 2+ times recently): ${[...unreliableMoves].join(', ')}` : '',
                        `Pick the best move index (single digit):`,
                    ].filter(Boolean).join('\n'),
                },
            ],
            max_tokens: 3,
            temperature: 0.1,
        })

        const raw = completion.choices[0]?.message?.content?.trim() ?? '0'
        const parsed = parseInt(raw[0] ?? '0', 10)
        // Only accept if it's in the available move list
        if (!isNaN(parsed) && movesToUse.some(({ i }) => i === parsed)) {
            moveIndex = parsed
        }
    } catch {
        // Fallback: weighted random over available moves
        const weights = movesToUse.map(({ a, i }) => {
            const base = Math.max(1, a.damage ?? 1)
            return i === lastNMoveIndex ? base * 0.5 : base
        })
        const total = weights.reduce((s, w) => s + w, 0)
        let roll = Math.random() * total
        const picked = weights.findIndex(w => { roll -= w; return roll <= 0 })
        moveIndex = movesToUse[picked >= 0 ? picked : 0]?.i ?? 0
    }

    await supabase
        .from('n_battles')
        .update({ n_next_move: { attackIndex: moveIndex } })
        .eq('id', battleId)

    return NextResponse.json({ ok: true, moveIndex })
}
