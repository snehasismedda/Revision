-- Up migration for add_thumbnail_to_files
ALTER TABLE revision.files ADD COLUMN thumbnail TEXT;
