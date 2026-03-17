-- Phase 7A: Performance indexes for query patterns
-- Run after all previous migrations

-- Speed up download deduplication checks in useDownloadedPresets
-- Query: SELECT * FROM downloads WHERE user_id = ? AND analysis_id = ?
CREATE INDEX IF NOT EXISTS idx_downloads_user_analysis
  ON downloads(user_id, analysis_id);

-- Speed up challenge leaderboard queries (sorted by match_score DESC)
-- Query: SELECT * FROM challenge_submissions WHERE challenge_id = ? ORDER BY match_score DESC
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_leaderboard
  ON challenge_submissions(challenge_id, match_score DESC);
