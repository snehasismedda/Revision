-- Down migration for add_is_system_to_folders
ALTER TABLE revision.file_folders DROP COLUMN is_system;
