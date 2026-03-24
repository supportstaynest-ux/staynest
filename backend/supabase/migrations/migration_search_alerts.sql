-- ============================================
-- Search Alerts - Location-based PG notifications
-- ============================================

-- Table to store user search alerts
CREATE TABLE IF NOT EXISTS search_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  location text NOT NULL,
  onesignal_player_id text NOT NULL,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for fast location lookup when vendor adds listing
CREATE INDEX IF NOT EXISTS idx_search_alerts_location ON search_alerts(location);

-- Unique constraint: one alert per user per location (upsert-friendly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_alerts_unique 
ON search_alerts(user_id, location);

-- Index for cleanup of old alerts
CREATE INDEX IF NOT EXISTS idx_search_alerts_created ON search_alerts(created_at);

-- RLS policies
ALTER TABLE search_alerts ENABLE ROW LEVEL SECURITY;

-- Users can insert their own search alerts
CREATE POLICY "Users can insert own search alerts"
ON search_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own search alerts
CREATE POLICY "Users can view own search alerts"
ON search_alerts FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own alerts (for upsert)
CREATE POLICY "Users can update own search alerts"
ON search_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Allow anon/authenticated to read for notification matching (backend uses service key, but fallback)
CREATE POLICY "Allow read for notification matching"
ON search_alerts FOR SELECT USING (true);

-- Allow update for marking notified (backend uses service key)
CREATE POLICY "Allow update for marking notified"
ON search_alerts FOR UPDATE USING (true);
