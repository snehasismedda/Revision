-- Down migration for add_reference_id_to_source_images
DROP INDEX IF EXISTS revision.idx_source_images_reference_id;
ALTER TABLE revision.source_images DROP COLUMN IF EXISTS reference_id;
