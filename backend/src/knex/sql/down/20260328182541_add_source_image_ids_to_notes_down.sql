-- Down migration for add_source_image_ids_to_notes
ALTER TABLE revision.notes DROP COLUMN IF EXISTS source_image_ids;
