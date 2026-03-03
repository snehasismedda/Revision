-- Up migration for allow_generic_sessions

-- 1. Alter revision.sessions
ALTER TABLE revision.sessions ALTER COLUMN subject_id DROP NOT NULL;
ALTER TABLE revision.sessions ADD COLUMN test_id UUID;
-- User requested NOT to use FKs, so we just add the column for indexing/lookup
CREATE INDEX idx_sessions_test_id ON revision.sessions(test_id);
