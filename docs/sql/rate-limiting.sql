-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting + analytics
--
-- Two tables:
--   rate_limit_windows  — one row per (account, day). Daily counter + peak
--                         burst minute. This IS the analytics table — query it
--                         in Supabase to see usage distribution and spot abuse.
--
--   rate_limit_minutes  — one row per (account, minute). Short-lived burst
--                         tracking. Safe to prune rows older than 2 hours.
--
-- One atomic function:
--   increment_rate_limit(account_id, window_date, window_minute)
--     → increments both counters in one call, updates peak_minute,
--       returns (daily_count, minute_count).
--
-- Limits enforced in lib/rateLimit.ts:
--   free:  350 req/day,  70 req/min
--   paid: 1750 req/day, 350 req/min
--   abuse hard cap: 10,000 req/day (any tier)
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── TABLES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limit_windows (
  account_id   UUID        NOT NULL,
  window_date  DATE        NOT NULL,
  daily_count  INTEGER     NOT NULL DEFAULT 0,
  peak_minute  INTEGER     NOT NULL DEFAULT 0,   -- highest req/min seen that day
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, window_date)
);

CREATE TABLE IF NOT EXISTS rate_limit_minutes (
  account_id     UUID        NOT NULL,
  window_minute  TIMESTAMPTZ NOT NULL,            -- truncated to the minute boundary
  count          INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, window_minute)
);

-- Indexes for analytics queries (e.g. "show me all accounts with high usage today")
CREATE INDEX IF NOT EXISTS idx_rl_windows_date    ON rate_limit_windows (window_date);
CREATE INDEX IF NOT EXISTS idx_rl_windows_high    ON rate_limit_windows (daily_count DESC);
CREATE INDEX IF NOT EXISTS idx_rl_minutes_account ON rate_limit_minutes (account_id, window_minute DESC);


-- ─── ATOMIC INCREMENT FUNCTION ───────────────────────────────────────────────
-- Called once per API request. Increments both the daily and minute counters
-- atomically via INSERT ... ON CONFLICT DO UPDATE, then updates peak_minute.
-- Returns the NEW counts (after increment) so the caller can decide to block.

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_account_id  uuid,
  p_window_date date,
  p_window_min  timestamptz
)
RETURNS TABLE(daily_count int, minute_count int)
LANGUAGE plpgsql AS $$
DECLARE
  v_daily  int;
  v_minute int;
BEGIN
  -- Increment daily counter
  INSERT INTO rate_limit_windows (account_id, window_date, daily_count, peak_minute, updated_at)
  VALUES (p_account_id, p_window_date, 1, 0, NOW())
  ON CONFLICT (account_id, window_date)
  DO UPDATE SET
    daily_count = rate_limit_windows.daily_count + 1,
    updated_at  = NOW()
  RETURNING rate_limit_windows.daily_count INTO v_daily;

  -- Increment minute counter
  INSERT INTO rate_limit_minutes (account_id, window_minute, count)
  VALUES (p_account_id, p_window_min, 1)
  ON CONFLICT (account_id, window_minute)
  DO UPDATE SET count = rate_limit_minutes.count + 1
  RETURNING rate_limit_minutes.count INTO v_minute;

  -- Keep peak_minute up to date on the daily row
  UPDATE rate_limit_windows
  SET peak_minute = GREATEST(peak_minute, v_minute)
  WHERE account_id = p_account_id AND window_date = p_window_date;

  RETURN QUERY SELECT v_daily, v_minute;
END;
$$;


-- ─── PRUNE HELPER ────────────────────────────────────────────────────────────
-- rate_limit_minutes rows older than 2 hours are useless.
-- Call this manually or set up a pg_cron job:
--   SELECT cron.schedule('prune-rl-minutes', '*/30 * * * *', 'SELECT prune_rate_limit_minutes()');

CREATE OR REPLACE FUNCTION prune_rate_limit_minutes()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM rate_limit_minutes WHERE window_minute < NOW() - INTERVAL '2 hours';
$$;


-- ─── ANALYTICS QUERIES ───────────────────────────────────────────────────────
-- Paste these into the Supabase SQL editor to monitor usage.

-- Top 20 accounts by requests today:
-- SELECT account_id, daily_count, peak_minute
-- FROM rate_limit_windows
-- WHERE window_date = CURRENT_DATE
-- ORDER BY daily_count DESC
-- LIMIT 20;

-- Daily average across all accounts over the last 30 days:
-- SELECT window_date, ROUND(AVG(daily_count), 1) AS avg_req, MAX(daily_count) AS max_req, COUNT(*) AS active_accounts
-- FROM rate_limit_windows
-- WHERE window_date >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY window_date
-- ORDER BY window_date DESC;

-- Accounts that hit the abuse threshold (>10k) ever:
-- SELECT account_id, window_date, daily_count
-- FROM rate_limit_windows
-- WHERE daily_count > 10000
-- ORDER BY daily_count DESC;
