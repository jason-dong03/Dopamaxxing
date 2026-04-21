-- ── Black Market ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS black_market (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  active_from   timestamptz NOT NULL DEFAULT now(),
  active_until  timestamptz NOT NULL,
  next_market_at timestamptz NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS black_market_items (
  id                 uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id          uuid    NOT NULL REFERENCES black_market(id) ON DELETE CASCADE,
  pack_id            text    NOT NULL,
  discount_pct       numeric NOT NULL,
  quantity_total     int     NOT NULL,
  quantity_remaining int     NOT NULL,
  created_at         timestamptz DEFAULT now()
);

-- ── Player Trading ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trades (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposer_id uuid NOT NULL REFERENCES profiles(id),
  receiver_id uuid NOT NULL REFERENCES profiles(id),
  status      text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','declined','cancelled')),
  want_note   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id    uuid NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  user_card_id uuid NOT NULL REFERENCES user_cards(id),
  created_at  timestamptz DEFAULT now()
);

-- Track completed trades for quest metric
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trades_completed int NOT NULL DEFAULT 0;

-- N's Quest: add trade_completed flag to quest progress
ALTER TABLE n_quest_progress ADD COLUMN IF NOT EXISTS trade_completed boolean NOT NULL DEFAULT false;

-- RPC helper used by trade-accept endpoint
CREATE OR REPLACE FUNCTION increment_trades_completed(uid uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE profiles SET trades_completed = trades_completed + 1 WHERE id = uid;
$$;

-- Optional: insert the quest objective into quests table
-- INSERT INTO quests (slug, name, description, quest_type, category, difficulty,
--   coin_reward, xp_reward, cooldown_hours, requirement_metric, requirement_target, is_active)
-- VALUES ('n-trade-1', 'Sealed Deal', 'Complete your first player trade.',
--   'auto', 'ingame', 'medium', 500, 200, null, 'trade_completed', 1, true)
-- ON CONFLICT (slug) DO NOTHING;
