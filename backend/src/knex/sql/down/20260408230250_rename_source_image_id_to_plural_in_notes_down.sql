-- Down migration for rename_source_image_id_to_plural_in_notes

-- 1. Recreate the singular column
ALTER TABLE revision.notes 
ADD COLUMN source_image_id UUID;

-- 2. Restore the first image ID from the plural array
UPDATE revision.notes
SET source_image_id = source_image_ids[1]
WHERE cardinality(source_image_ids) > 0;
