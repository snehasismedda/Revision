-- Up migration for rename_source_image_id_to_plural_in_notes

-- 1. Migrate any data from source_image_id if it's not null and source_image_ids is empty
UPDATE revision.notes 
SET source_image_ids = array_append(COALESCE(source_image_ids, '{}'), source_image_id)
WHERE source_image_id IS NOT NULL 
AND (source_image_ids IS NULL OR cardinality(source_image_ids) = 0);

-- 2. Drop the singular column
ALTER TABLE revision.notes 
DROP COLUMN source_image_id;

-- 3. Ensure the plural column has a proper default
ALTER TABLE revision.notes
ALTER COLUMN source_image_ids SET DEFAULT '{}'::uuid[];
