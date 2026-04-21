'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RARITY_COLOR } from '@/lib/rarityConfig'

type TradeCard = {
    id: string
    card_id: string
    cards: { id: string; name: string; image_url: string; rarity: string }
}
type TradeUser = { id: string; username: string; profile_url: string | null }
type Trade = {
    id: string
    status: string
    want_note: string | null
    created_at: string
    proposer: TradeUser
    receiver: TradeUser
    trade_items: TradeCard[]
}
type OwnCard = { id: string; card_id: string; cards: { name: string; image_url: string; rarity: string } }

const RARITY_SORT: Record<string, number> = {
    '???': 0, Celestial: 1, Divine: 2, Legendary: 3, Mythical: 4,
    Epic: 5, Rare: 6, Uncommon: 7, Common: 8,
}

export default function TradeView({ currentUserId }: { currentUserId: string }) {
    const [trades, setTrades] = useState<Trade[]>([])
    const [tab, setTab] = useState<'incoming' | 'outgoing' | 'new'>('incoming')
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState<string | null>(null)

    // New trade form state
    const [searchUser, setSearchUser] = useState('')
    const [foundUser, setFoundUser] = useState<TradeUser | null>(null)
    const [userSearching, setUserSearching] = useState(false)
    const [selectedCards, setSelectedCards] = useState<string[]>([])
    const [wantNote, setWantNote] = useState('')
    const [myCards, setMyCards] = useState<OwnCard[]>([])
    const [myCardsLoading, setMyCardsLoading] = useState(false)
    const [cardSearch, setCardSearch] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const supabase = createClient()

    const fetchTrades = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/trades')
            const data = await res.json()
            setTrades(data.trades ?? [])
        } catch {}
        setLoading(false)
    }, [])

    useEffect(() => { fetchTrades() }, [fetchTrades])

    async function loadMyCards() {
        if (myCards.length > 0) return
        setMyCardsLoading(true)
        const { data } = await supabase
            .from('user_cards')
            .select('id, card_id, cards(name, image_url, rarity)')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false })
            .limit(200)
        setMyCards(((data ?? []) as unknown as OwnCard[]).sort((a, b) =>
            (RARITY_SORT[a.cards?.rarity] ?? 9) - (RARITY_SORT[b.cards?.rarity] ?? 9)
        ))
        setMyCardsLoading(false)
    }

    useEffect(() => {
        if (tab === 'new') loadMyCards()
    }, [tab])

    async function searchForUser() {
        if (!searchUser.trim()) return
        setUserSearching(true)
        setFoundUser(null)
        const { data } = await supabase
            .from('profiles')
            .select('id, username, profile_url')
            .ilike('username', searchUser.trim())
            .neq('id', currentUserId)
            .limit(1)
            .maybeSingle()
        setFoundUser(data as TradeUser | null)
        setUserSearching(false)
    }

    async function handleAction(tradeId: string, action: 'accept' | 'decline' | 'cancel') {
        if (acting) return
        setActing(tradeId)
        try {
            const res = await fetch(`/api/trades/${tradeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            })
            if (res.ok) {
                setTrades(prev => prev.filter(t => t.id !== tradeId))
            }
        } catch {}
        setActing(null)
    }

    async function submitTrade() {
        if (!foundUser || selectedCards.length === 0) return
        setSubmitting(true)
        setSubmitError(null)
        try {
            const res = await fetch('/api/trades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId: foundUser.id, cardIds: selectedCards, wantNote: wantNote.trim() || null }),
            })
            const data = await res.json()
            if (!res.ok) { setSubmitError(data.error ?? 'Failed'); return }
            setSubmitSuccess(true)
            setFoundUser(null); setSearchUser(''); setSelectedCards([]); setWantNote('')
            fetchTrades()
            setTimeout(() => { setSubmitSuccess(false); setTab('outgoing') }, 1200)
        } catch { setSubmitError('Network error') }
        setSubmitting(false)
    }

    const incoming = trades.filter(t => t.receiver.id === currentUserId)
    const outgoing = trades.filter(t => t.proposer.id === currentUserId)

    const tabBtn = (id: 'incoming' | 'outgoing' | 'new', label: string, count?: number) => (
        <button
            onClick={() => setTab(id)}
            style={{
                flex: 1, padding: '7px 0', fontSize: '0.68rem', fontWeight: 700,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === id ? '#60a5fa' : 'transparent'}`,
                color: tab === id ? '#60a5fa' : '#4b5563',
                transition: 'all 150ms ease',
            }}
        >
            {label}{count ? ` (${count})` : ''}
        </button>
    )

    const cardRow = (item: TradeCard) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cards.image_url} alt={item.cards.name}
                style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
            <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#e5e7eb' }}>{item.cards.name}</div>
                <div style={{ fontSize: '0.55rem', color: (RARITY_COLOR as Record<string, string>)[item.cards.rarity] ?? '#9ca3af' }}>
                    {item.cards.rarity}
                </div>
            </div>
        </div>
    )

    const tradeCard = (t: Trade, isIncoming: boolean) => (
        <div key={t.id} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                    {isIncoming ? (
                        <><span style={{ color: '#60a5fa', fontWeight: 600 }}>{t.proposer.username}</span> offers you:</>
                    ) : (
                        <>To <span style={{ color: '#60a5fa', fontWeight: 600 }}>{t.receiver.username}</span>:</>
                    )}
                </div>
                <span style={{ fontSize: '0.52rem', color: '#4b5563' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {t.trade_items.map(cardRow)}
            </div>
            {t.want_note && (
                <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 8 }}>
                    Wants: {t.want_note}
                </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
                {isIncoming ? (
                    <>
                        <button
                            onClick={() => handleAction(t.id, 'accept')}
                            disabled={acting === t.id}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: '0.65rem', fontWeight: 700, cursor: acting === t.id ? 'not-allowed' : 'pointer' }}
                        >
                            {acting === t.id ? '…' : 'Accept'}
                        </button>
                        <button
                            onClick={() => handleAction(t.id, 'decline')}
                            disabled={acting === t.id}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.65rem', fontWeight: 700, cursor: acting === t.id ? 'not-allowed' : 'pointer' }}
                        >
                            Decline
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => handleAction(t.id, 'cancel')}
                        disabled={acting === t.id}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6b7280', fontSize: '0.65rem', fontWeight: 600, cursor: acting === t.id ? 'not-allowed' : 'pointer' }}
                    >
                        {acting === t.id ? '…' : 'Cancel'}
                    </button>
                )}
            </div>
        </div>
    )

    const filteredMyCards = myCards.filter(c =>
        !cardSearch || c.cards.name.toLowerCase().includes(cardSearch.toLowerCase())
    )

    return (
        <div style={{ fontFamily: 'inherit' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 14 }}>
                {tabBtn('incoming', 'Incoming', incoming.length || undefined)}
                {tabBtn('outgoing', 'Outgoing', outgoing.length || undefined)}
                {tabBtn('new', '+ New Trade')}
            </div>

            {loading && (tab === 'incoming' || tab === 'outgoing') && (
                <p style={{ fontSize: '0.72rem', color: '#4b5563', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
            )}

            {/* Incoming */}
            {tab === 'incoming' && !loading && (
                incoming.length === 0
                    ? <p style={{ fontSize: '0.72rem', color: '#4b5563', textAlign: 'center', padding: '20px 0' }}>No incoming trade offers.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {incoming.map(t => tradeCard(t, true))}
                    </div>
            )}

            {/* Outgoing */}
            {tab === 'outgoing' && !loading && (
                outgoing.length === 0
                    ? <p style={{ fontSize: '0.72rem', color: '#4b5563', textAlign: 'center', padding: '20px 0' }}>No outgoing trade offers.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {outgoing.map(t => tradeCard(t, false))}
                    </div>
            )}

            {/* New trade form */}
            {tab === 'new' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Step 1: Find user */}
                    <div>
                        <label style={{ fontSize: '0.62rem', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                            Send offer to
                        </label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <input
                                value={searchUser}
                                onChange={e => { setSearchUser(e.target.value); setFoundUser(null) }}
                                onKeyDown={e => e.key === 'Enter' && searchForUser()}
                                placeholder="Enter username…"
                                style={{
                                    flex: 1, padding: '7px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#e5e7eb', fontSize: '0.75rem', outline: 'none',
                                }}
                            />
                            <button onClick={searchForUser} disabled={userSearching}
                                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                {userSearching ? '…' : 'Find'}
                            </button>
                        </div>
                        {foundUser && (
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
                                {foundUser.profile_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={foundUser.profile_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                                )}
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4ade80' }}>{foundUser.username}</span>
                                <span style={{ fontSize: '0.6rem', color: '#4ade80', marginLeft: 'auto' }}>✓ found</span>
                            </div>
                        )}
                        {foundUser === null && searchUser && !userSearching && (
                            <p style={{ fontSize: '0.62rem', color: '#f87171', marginTop: 6 }}>User not found.</p>
                        )}
                    </div>

                    {/* Step 2: Select cards to offer */}
                    <div>
                        <label style={{ fontSize: '0.62rem', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                            Cards you offer ({selectedCards.length}/5)
                        </label>
                        <input
                            value={cardSearch}
                            onChange={e => setCardSearch(e.target.value)}
                            placeholder="Search your cards…"
                            style={{
                                width: '100%', marginTop: 6, padding: '6px 12px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e5e7eb', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                        {myCardsLoading ? (
                            <p style={{ fontSize: '0.7rem', color: '#4b5563', textAlign: 'center', padding: '12px 0' }}>Loading cards…</p>
                        ) : (
                            <div style={{
                                marginTop: 8, maxHeight: 240, overflowY: 'auto', display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6,
                                scrollbarWidth: 'none',
                            }}>
                                {filteredMyCards.slice(0, 60).map(c => {
                                    const selected = selectedCards.includes(c.id)
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                if (selected) setSelectedCards(prev => prev.filter(id => id !== c.id))
                                                else if (selectedCards.length < 5) setSelectedCards(prev => [...prev, c.id])
                                            }}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                padding: 6, borderRadius: 8, cursor: 'pointer',
                                                border: selected ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(255,255,255,0.06)',
                                                background: selected ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.03)',
                                                transition: 'all 120ms ease',
                                            }}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={c.cards.image_url} alt={c.cards.name}
                                                style={{ width: '100%', maxHeight: 80, objectFit: 'contain' }} />
                                            <span style={{ fontSize: '0.55rem', color: '#d1d5db', textAlign: 'center', lineHeight: 1.2 }}>
                                                {c.cards.name}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Step 3: Want note */}
                    <div>
                        <label style={{ fontSize: '0.62rem', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                            What you want in return (optional)
                        </label>
                        <textarea
                            value={wantNote}
                            onChange={e => setWantNote(e.target.value)}
                            placeholder="e.g. Any Base Set Charizard…"
                            rows={2}
                            style={{
                                width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e5e7eb', fontSize: '0.72rem', outline: 'none', resize: 'vertical',
                                boxSizing: 'border-box', fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    {submitError && <p style={{ fontSize: '0.68rem', color: '#f87171' }}>{submitError}</p>}
                    {submitSuccess && <p style={{ fontSize: '0.68rem', color: '#4ade80' }}>Trade offer sent!</p>}

                    <button
                        onClick={submitTrade}
                        disabled={!foundUser || selectedCards.length === 0 || submitting}
                        style={{
                            padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem',
                            border: '1px solid rgba(96,165,250,0.5)',
                            background: (!foundUser || selectedCards.length === 0) ? 'rgba(255,255,255,0.03)' : 'rgba(96,165,250,0.15)',
                            color: (!foundUser || selectedCards.length === 0) ? '#4b5563' : '#60a5fa',
                            cursor: (!foundUser || selectedCards.length === 0 || submitting) ? 'not-allowed' : 'pointer',
                            transition: 'all 150ms ease',
                        }}
                    >
                        {submitting ? 'Sending…' : 'Send Trade Offer'}
                    </button>
                </div>
            )}
        </div>
    )
}
