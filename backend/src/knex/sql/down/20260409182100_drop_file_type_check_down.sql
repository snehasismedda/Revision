-- Down migration for drop_file_type_check
-- Re-add the check constraint with the original allowed types
ALTER TABLE revision.files ADD CONSTRAINT files_file_type_check CHECK (file_type IN ('image', 'pdf', 'doc', 'xlsx'));
