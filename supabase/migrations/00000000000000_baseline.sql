-- Baseline migration: marks existing schema as applied.
-- All tables and functions already exist in the production database.
-- This file exists so `supabase db push` knows not to re-run old migrations.
--
-- Previous migrations (applied manually):
--   schema.sql, storage.sql, phase2a through phase6b
--
-- DO NOT modify this file. Create new migrations with:
--   supabase migration new <name>

SELECT 1; -- no-op, schema already exists
