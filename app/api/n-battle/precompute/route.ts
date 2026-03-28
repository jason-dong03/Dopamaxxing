import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { BattleCard } from '@/lib/n-battle'

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

    const nActive: BattleCard  = battle.n_cards[battle.n_active_index]
    const userActive: BattleCard = battle.user_cards[battle.user_active_index]

    const nHpPct   = Math.round((nActive.hp / nActive.maxHp) * 100)
    const uHpPct   = Math.round((userActive.hp / userActive.maxHp) * 100)
    const nAtkStage = (nActive as any).attackStage  ?? 0
    const nDefStage = (nActive as any).defenseStage ?? 0
    const nSpdStage = (nActive as any).speedStage   ?? 0
    const uAtkStage = (userActive as any).attackStage  ?? 0
    const uDefStage = (userActive as any).defenseStage ?? 0
    const uSpdStage = (userActive as any).speedStage   ?? 0

    // Find the last move N used (to avoid blindly repeating it)
    const battleLog: any[] = battle.battle_log ?? []
    const lastNEntry = [...battleLog].reverse().find(e => e.actor === 'n' && e.attackName !== 'Status')
    const lastNMoveName: string | null = lastNEntry?.attackName ?? null
    const lastNMoveIndex: number = lastNMoveName != null
        ? ((nActive.attacks as any[]).findIndex((a: any) => a.name === lastNMoveName))
        : -1

    const attackList = (nActive.attacks as any[])
        .map((a, i) => {
            const tags: string[] = []
            if (a.healFraction)   tags.push(`heals ${Math.round(a.healFraction * 100)}% HP`)
            if (a.selfBoosts)     tags.push(`self: ${a.selfBoosts.map((b: any) => `${b.stat}+${b.stages}`).join(',')}`)
            if (a.enemyDrops)     tags.push(`foe: ${a.enemyDrops.map((b: any) => `${b.stat}${b.stages}`).join(',')}`)
            if (a.statusInflict)  tags.push(`inflicts ${a.statusInflict}${a.alwaysInflict ? ' (100%)' : ' (40%)'}`)
            if (a.priority > 0)   tags.push(`priority+${a.priority}`)
            if (a.selfDamage)     tags.push(`recoil ${a.selfDamage}`)
            const extra = tags.length ? ` [${tags.join(', ')}]` : ''
            return `${i}: ${a.name} — dmg:${a.damage ?? 0} type:${a.attackType ?? '?'} — ${a.effect}${extra}`
        })
        .join('\n')

    let moveIndex = 0

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `You are N from Pokémon Black/White — a cold, tactical battler who treats Pokémon as partners. Choose the best move index using real competitive strategy:
- Use status moves (paralysis/poison/burn/sleep) when the foe has no status condition yet
- Use self-buff moves (selfBoosts tag) when HP > 60% AND the relevant stat stage is below +2
- Use enemy-debuff moves (enemyDrops tag) when the foe's relevant stat stage is above -2 and you are not at risk of fainting this turn
- Use healing moves when your HP is below 40%
- Use your strongest attacking move when you already have a relevant stat boost (+1 or more)
- Use priority moves when the foe is at low HP and a normal move might not land first
- Never use a self-buff move if the relevant stage is already at +2 or higher — use an attack instead
- Never use a debuff move if the foe's relevant stage is already at -2 or lower
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
                        ``,
                        `Moves:\n${attackList}`,
                        ``,
                        lastNMoveName ? `Last move used: ${lastNMoveName} (index ${lastNMoveIndex}) — avoid repeating unless it's clearly optimal.` : '',
                        `Pick the best move index (single digit):`,
                    ].filter(Boolean).join('\n'),
                },
            ],
            max_tokens: 3,
            temperature: 0.1,
        })

        const raw = completion.choices[0]?.message?.content?.trim() ?? '0'
        const parsed = parseInt(raw[0] ?? '0', 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed < nActive.attacks.length) {
            moveIndex = parsed
        }
    } catch {
        // Fallback: weighted random — higher-damage moves are preferred,
        // but the last-used move gets half weight to encourage variety
        const attacks = nActive.attacks as any[]
        const weights = attacks.map((a, i) => {
            const base = Math.max(1, a.damage ?? 1)
            return i === lastNMoveIndex ? base * 0.5 : base
        })
        const total = weights.reduce((s, w) => s + w, 0)
        let roll = Math.random() * total
        moveIndex = weights.findIndex(w => { roll -= w; return roll <= 0 })
        if (moveIndex === -1) moveIndex = 0
    }

    await supabase
        .from('n_battles')
        .update({ n_next_move: { attackIndex: moveIndex } })
        .eq('id', battleId)

    return NextResponse.json({ ok: true, moveIndex })
}
