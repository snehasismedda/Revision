ALTER TABLE revision.notes
  ADD COLUMN IF NOT EXISTS key_highlights JSONB NOT NULL DEFAULT '[]'::jsonb;
