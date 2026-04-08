-- Up migration for rename_source_images_to_files_add_file_type

-- Rename the table
ALTER TABLE revision.source_images RENAME TO files;

-- Rename sequence/constraint names to match (if any, PostgreSQL usually auto-renames primary key constraints)
-- Add file_type column with check constraint
ALTER TABLE revision.files 
ADD COLUMN file_type VARCHAR(10) NOT NULL DEFAULT 'image'
CHECK (file_type IN ('image', 'pdf', 'doc', 'xlsx'));

-- Rename indexes to match new table name
ALTER INDEX IF EXISTS idx_source_images_reference_id RENAME TO idx_files_reference_id;

-- Update foreign key references in other tables
-- (source_image_id columns in questions, notes - they reference old table)
-- PostgreSQL automatically tracks these; we just need to update our code layer
