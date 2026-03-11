-- Up migration for add_tags_to_notes
ALTER TABLE revision.notes ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_notes_tags ON revision.notes USING gin(tags);
