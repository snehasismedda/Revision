-- Up migration for drop_file_type_check
-- Drop the check constraint from the files table to allow broad file type support
ALTER TABLE revision.files DROP CONSTRAINT IF EXISTS files_file_type_check;
