-- Down migration for rename_source_images_to_files_add_file_type

-- Remove file_type column first
ALTER TABLE revision.files DROP COLUMN IF EXISTS file_type;

-- Rename index back
ALTER INDEX IF EXISTS idx_files_reference_id RENAME TO idx_source_images_reference_id;

-- Rename table back
ALTER TABLE revision.files RENAME TO source_images;
