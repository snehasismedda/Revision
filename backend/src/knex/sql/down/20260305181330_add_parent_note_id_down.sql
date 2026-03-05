-- Down migration for add_parent_note_id
ALTER TABLE revision.notes DROP COLUMN IF EXISTS parent_note_id;
