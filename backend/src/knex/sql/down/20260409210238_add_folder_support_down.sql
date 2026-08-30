-- Down migration for add_folder_support

ALTER TABLE revision.files DROP COLUMN IF EXISTS folder_id;
DROP TABLE IF EXISTS revision.file_folders;
