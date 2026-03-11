-- Down migration for add_tags_to_notes
DROP INDEX IF EXISTS idx_notes_tags;
ALTER TABLE revision.notes DROP COLUMN IF EXISTS tags;
