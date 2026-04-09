-- Up migration for add_folder_support

CREATE TABLE revision.file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID,
  subject_id UUID,
  test_series_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE revision.files ADD COLUMN folder_id UUID;
