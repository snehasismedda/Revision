-- Up migration for add_is_system_to_folders
ALTER TABLE revision.file_folders ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;
