/*
 * ─── Required DB migrations ───────────────────────────────────────────────────
 *
 * Run these once in the Supabase SQL editor:
 *
 * -- Track stats on profiles
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS packs_opened INTEGER DEFAULT 0;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cards_fed    INTEGER DEFAULT 0;
 *
 * -- Quest completion log
 * CREATE TABLE IF NOT EXISTS user_quest_completions (
 *   id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id      UUID REFERENCES auth.users(id) NOT NULL,
 *   quest_id     TEXT NOT NULL,
 *   notes        TEXT,
 *   completed_at TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(user_id, quest_id)
 * );
 * ALTER TABLE user_quest_completions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "own completions" ON user_quest_completions
 *   FOR ALL USING (auth.uid() = user_id);
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type QuestCategory =
    | 'ingame'
    | 'study'
    | 'gaming'
    | 'life'
    | 'entertainment'

export type QuestType = 'auto' | 'self_report'
export type QuestDifficulty = 'easy' | 'medium' | 'hard'
export type AutoMetric = 'packs_opened' | 'cards_owned' | 'cards_fed'

export type Quest = {
    id: string
    title: string
    description: string
    category: QuestCategory
    type: QuestType
    difficulty: QuestDifficulty
    icon: string
    reward: { coins: number; xp: number }
    // auto quests — progress tracked by metric
    requirement?: { metric: AutoMetric; target: number }
    // self-report quests — shown as a hint below the claim button
    verificationHint?: string
    verificationSuggestion?: string
    // repeatable quests — cooldown in hours before can claim again (undefined = one-time)
    cooldownHours?: number
}

export const CATEGORY_META: Record<
    QuestCategory,
    { label: string; icon: string; color: string }
> = {
    ingame:        { label: 'In-Game',      icon: '📦', color: '#60a5fa' },
    study:         { label: 'Study',        icon: '📚', color: '#4ade80' },
    gaming:        { label: 'Gaming',       icon: '🎮', color: '#fb923c' },
    life:          { label: 'Life',         icon: '🌱', color: '#f472b4' },
    entertainment: { label: 'Entertainment',icon: '🎵', color: '#c084fc' },
}

export const DIFFICULTY_COLOR: Record<QuestDifficulty, string> = {
    easy:   '#4ade80',
    medium: '#fb923c',
    hard:   '#f87171',
}

// ─── quest catalog ─────────────────────────────────────────────────────────────

export const QUEST_CATALOG: Quest[] = [

    // ── In-Game (auto) ────────────────────────────────────────────────────────

    {
        id: 'first-pack',
        title: 'First Pull',
        description: 'Open your very first pack',
        category: 'ingame',
        type: 'auto',
        difficulty: 'easy',
        icon: '📦',
        reward: { coins: 50, xp: 25 },
        requirement: { metric: 'packs_opened', target: 1 },
    },
    {
        id: 'pack-collector-10',
        title: 'Pack Collector',
        description: 'Open 10 packs total',
        category: 'ingame',
        type: 'auto',
        difficulty: 'easy',
        icon: '📦',
        reward: { coins: 120, xp: 60 },
        requirement: { metric: 'packs_opened', target: 10 },
    },
    {
        id: 'pack-enthusiast-50',
        title: 'Pack Enthusiast',
        description: 'Open 50 packs total — getting serious',
        category: 'ingame',
        type: 'auto',
        difficulty: 'medium',
        icon: '🔥',
        reward: { coins: 500, xp: 200 },
        requirement: { metric: 'packs_opened', target: 50 },
    },
    {
        id: 'pack-master-100',
        title: 'Pack Master',
        description: 'Open 100 packs — a true collector',
        category: 'ingame',
        type: 'auto',
        difficulty: 'hard',
        icon: '🏆',
        reward: { coins: 1200, xp: 500 },
        requirement: { metric: 'packs_opened', target: 100 },
    },
    {
        id: 'collector-25',
        title: 'Starting Collection',
        description: 'Own 25 different cards',
        category: 'ingame',
        type: 'auto',
        difficulty: 'easy',
        icon: '🃏',
        reward: { coins: 100, xp: 50 },
        requirement: { metric: 'cards_owned', target: 25 },
    },
    {
        id: 'collector-100',
        title: 'Card Hoarder',
        description: 'Own 100 different cards',
        category: 'ingame',
        type: 'auto',
        difficulty: 'hard',
        icon: '🗃️',
        reward: { coins: 600, xp: 300 },
        requirement: { metric: 'cards_owned', target: 100 },
    },
    {
        id: 'feeder-10',
        title: 'Power Feeder',
        description: 'Feed 10 cards to level up your collection',
        category: 'ingame',
        type: 'auto',
        difficulty: 'easy',
        icon: '⚡',
        reward: { coins: 80, xp: 100 },
        requirement: { metric: 'cards_fed', target: 10 },
    },
    {
        id: 'feeder-50',
        title: 'XP Grinder',
        description: 'Feed 50 cards — your cards are growing strong',
        category: 'ingame',
        type: 'auto',
        difficulty: 'medium',
        icon: '💪',
        reward: { coins: 300, xp: 400 },
        requirement: { metric: 'cards_fed', target: 50 },
    },

    // ── Study (self-report) ───────────────────────────────────────────────────

    {
        id: 'study-30min',
        title: 'Study Session',
        description: 'Study for 30 minutes without distractions',
        category: 'study',
        type: 'self_report',
        difficulty: 'easy',
        icon: '📚',
        reward: { coins: 75, xp: 80 },
        cooldownHours: 24,
        verificationHint: 'Honor system — or screenshot a study timer',
        verificationSuggestion:
            'Try Forest, Pomodoro, or Focus Keeper and screenshot the completed session.',
    },
    {
        id: 'study-2hr',
        title: 'Deep Focus',
        description: 'Study for 2 straight hours — no shortcuts',
        category: 'study',
        type: 'self_report',
        difficulty: 'medium',
        icon: '🎓',
        reward: { coins: 200, xp: 250 },
        cooldownHours: 168,
        verificationHint: 'Screenshot of a 2h study timer',
        verificationSuggestion:
            'Share your Forest tree, Toggl entry, or any timer showing 2h+.',
    },
    {
        id: 'take-notes',
        title: 'Note-Taker',
        description: 'Take notes for a full class or lecture',
        category: 'study',
        type: 'self_report',
        difficulty: 'easy',
        icon: '✏️',
        reward: { coins: 60, xp: 70 },
        cooldownHours: 24,
        verificationHint: 'Photo of your notes',
        verificationSuggestion:
            'Quick photo of your notebook or a Notion/OneNote screenshot — both work!',
    },
    {
        id: 'finish-assignment',
        title: 'Assignment Slayer',
        description: 'Complete and submit an assignment',
        category: 'study',
        type: 'self_report',
        difficulty: 'medium',
        icon: '📝',
        reward: { coins: 150, xp: 180 },
        cooldownHours: 168,
        verificationHint: 'Screenshot of submission confirmation',
        verificationSuggestion:
            'Show the "submitted" page from Canvas, Blackboard, or your LMS.',
    },
    {
        id: 'write-essay',
        title: 'Essay Writer',
        description: 'Write and finish a full essay or paper',
        category: 'study',
        type: 'self_report',
        difficulty: 'hard',
        icon: '📄',
        reward: { coins: 400, xp: 400 },
        verificationHint: 'Doc word count or submission page',
        verificationSuggestion:
            'Share the word count from your doc or the LMS submission confirmation.',
    },
    {
        id: 'flashcards-20min',
        title: 'Flashcard Champion',
        description: 'Study with flashcards for 20 minutes',
        category: 'study',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🔖',
        reward: { coins: 50, xp: 60 },
        cooldownHours: 24,
        verificationHint: 'Anki/Quizlet session screenshot',
        verificationSuggestion:
            'Screenshot your Anki review stats or Quizlet study session.',
    },
    {
        id: 'read-chapter',
        title: 'Chapter Done',
        description: 'Read a full chapter of a textbook or assigned reading',
        category: 'study',
        type: 'self_report',
        difficulty: 'easy',
        icon: '📖',
        reward: { coins: 55, xp: 65 },
        cooldownHours: 24,
        verificationHint: 'Honor system',
        verificationSuggestion:
            'What chapter? Write it in your notes for accountability.',
    },

    // ── Gaming (self-report) ──────────────────────────────────────────────────

    {
        id: 'gaming-warmup',
        title: 'Warmup',
        description: 'Play any game for 30 minutes',
        category: 'gaming',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🎮',
        reward: { coins: 40, xp: 30 },
        cooldownHours: 24,
        verificationHint: 'Honor system',
        verificationSuggestion:
            'Just play! Or screenshot your Steam/Xbox activity.',
    },
    {
        id: 'valorant-1hr',
        title: 'Valo Grind',
        description: 'Play Valorant for 1 hour',
        category: 'gaming',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🔫',
        reward: { coins: 80, xp: 50 },
        cooldownHours: 24,
        verificationHint: 'Match history screenshot',
        verificationSuggestion:
            'Share your Valorant match history showing recent games played.',
    },
    {
        id: 'gaming-2hr',
        title: 'Long Session',
        description: 'Game for 2+ hours in one sitting',
        category: 'gaming',
        type: 'self_report',
        difficulty: 'medium',
        icon: '⌛',
        reward: { coins: 100, xp: 60 },
        cooldownHours: 168,
        verificationHint: 'Steam/Discord activity screenshot',
        verificationSuggestion:
            'Share Steam activity or Discord "Playing for X hours" status.',
    },
    {
        id: 'ranked-win',
        title: 'GG EZ',
        description: 'Win a ranked match in any game',
        category: 'gaming',
        type: 'self_report',
        difficulty: 'medium',
        icon: '🏅',
        reward: { coins: 120, xp: 80 },
        cooldownHours: 24,
        verificationHint: 'Victory screen screenshot',
        verificationSuggestion:
            'Share the post-game victory screen from your game of choice.',
    },
    {
        id: 'no-rage-quit',
        title: 'Composed',
        description: 'Play 3 competitive matches without rage quitting',
        category: 'gaming',
        type: 'self_report',
        difficulty: 'medium',
        icon: '😤',
        reward: { coins: 90, xp: 70 },
        cooldownHours: 24,
        verificationHint: 'Honor system — you know if you stayed',
        verificationSuggestion: 'Share match history showing 3 completed matches.',
    },

    // ── Life (self-report) ────────────────────────────────────────────────────

    {
        id: 'early-bird',
        title: 'Early Bird',
        description: 'Wake up before 8:00 AM',
        category: 'life',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🌅',
        reward: { coins: 30, xp: 40 },
        cooldownHours: 24,
        verificationHint: 'Screenshot of your clock',
        verificationSuggestion:
            'Quick phone screenshot before 8am works perfectly.',
    },
    {
        id: 'exercise-30min',
        title: 'Move It',
        description: 'Exercise for 30 minutes',
        category: 'life',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🏃',
        reward: { coins: 90, xp: 100 },
        cooldownHours: 24,
        verificationHint: 'Fitness app screenshot',
        verificationSuggestion:
            'Share from Apple Health, Google Fit, Strava, or gym check-in.',
    },
    {
        id: 'hydration',
        title: 'Stay Hydrated',
        description: 'Drink 8 glasses of water today',
        category: 'life',
        type: 'self_report',
        difficulty: 'easy',
        icon: '💧',
        reward: { coins: 25, xp: 30 },
        cooldownHours: 24,
        verificationHint: 'Honor system',
        verificationSuggestion:
            'Use WaterMinder or any water tracker. You know if you did it!',
    },
    {
        id: 'skill-practice',
        title: 'Practice Makes Perfect',
        description: 'Practice an instrument or creative skill for 20 min',
        category: 'life',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🎸',
        reward: { coins: 60, xp: 70 },
        cooldownHours: 24,
        verificationHint: 'Share what you practiced!',
        verificationSuggestion:
            'Photo of your instrument, a voice memo clip, or a practice app screenshot.',
    },
    {
        id: 'good-sleep',
        title: 'Well Rested',
        description: 'Get 8 hours of sleep',
        category: 'life',
        type: 'self_report',
        difficulty: 'easy',
        icon: '😴',
        reward: { coins: 35, xp: 45 },
        cooldownHours: 24,
        verificationHint: 'Sleep tracker screenshot',
        verificationSuggestion:
            'Apple Sleep, Oura Ring, or just your alarm/bedtime record.',
    },
    {
        id: 'cook-meal',
        title: 'Chef Mode',
        description: 'Cook yourself a proper meal (not instant noodles)',
        category: 'life',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🍳',
        reward: { coins: 45, xp: 50 },
        cooldownHours: 24,
        verificationHint: 'Photo of the meal',
        verificationSuggestion: 'Post the food pic! We want to see it.',
    },
    {
        id: 'clean-room',
        title: 'Desk Clear',
        description: 'Clean and organize your room or desk',
        category: 'life',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🧹',
        reward: { coins: 40, xp: 45 },
        cooldownHours: 168,
        verificationHint: 'Before/after photo',
        verificationSuggestion:
            'Before and after desk photo hits different as motivation.',
    },

    // ── Entertainment (self-report) ───────────────────────────────────────────

    {
        id: 'spotify-15min',
        title: 'Music Mood',
        description: 'Listen to 15 minutes of music',
        category: 'entertainment',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🎵',
        reward: { coins: 20, xp: 15 },
        cooldownHours: 24,
        verificationHint: 'Share what you listened to!',
        verificationSuggestion:
            'Share your current queue screenshot — or just be honest!',
    },
    {
        id: 'podcast-30min',
        title: 'Podcast Learner',
        description: 'Listen to an educational podcast for 30 min',
        category: 'entertainment',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🎙️',
        reward: { coins: 50, xp: 55 },
        cooldownHours: 24,
        verificationHint: 'Share the episode title!',
        verificationSuggestion:
            'Screenshot the episode + one thing you learned for bonus respect.',
    },
    {
        id: 'movie-night',
        title: 'Movie Night',
        description: 'Watch a full movie',
        category: 'entertainment',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🎬',
        reward: { coins: 45, xp: 30 },
        cooldownHours: 168,
        verificationHint: 'Share the title!',
        verificationSuggestion:
            'Tell us what you watched. Extra respect for trying something new.',
    },
    {
        id: 'watch-documentary',
        title: 'Brain Food',
        description: 'Watch a documentary or educational video (30+ min)',
        category: 'entertainment',
        type: 'self_report',
        difficulty: 'easy',
        icon: '🧠',
        reward: { coins: 55, xp: 60 },
        cooldownHours: 168,
        verificationHint: 'Share the title!',
        verificationSuggestion:
            'YouTube, Netflix, whatever — share what you watched.',
    },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

export function getProgress(
    quest: Quest,
    metrics: { packs_opened: number; cards_owned: number; cards_fed: number },
): number {
    if (quest.type !== 'auto' || !quest.requirement) return 0
    const { metric, target } = quest.requirement
    const current = metrics[metric] ?? 0
    return Math.min(current / target, 1)
}

export function isAutoComplete(
    quest: Quest,
    metrics: { packs_opened: number; cards_owned: number; cards_fed: number },
): boolean {
    return getProgress(quest, metrics) >= 1
}
