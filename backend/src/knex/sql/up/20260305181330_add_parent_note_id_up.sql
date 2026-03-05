-- Up migration for add_parent_note_id
ALTER TABLE revision.notes ADD COLUMN parent_note_id UUID;
