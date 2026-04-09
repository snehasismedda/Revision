-- Down migration for add_thumbnail_to_files
ALTER TABLE revision.files DROP COLUMN thumbnail;
