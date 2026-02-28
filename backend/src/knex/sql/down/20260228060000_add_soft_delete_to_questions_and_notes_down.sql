ALTER TABLE revision.questions DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE revision.questions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE revision.notes DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE revision.notes DROP COLUMN IF EXISTS deleted_at;
