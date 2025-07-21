-- Add all_round_questions column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS all_round_questions JSONB;