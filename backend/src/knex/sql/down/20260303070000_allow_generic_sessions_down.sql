-- Down migration for allow_generic_sessions

DROP INDEX IF EXISTS revision.idx_sessions_test_id;
ALTER TABLE revision.sessions DROP COLUMN IF EXISTS test_id;
-- Note: Re-enforcing NOT NULL might fail if generic sessions exist
-- ALTER TABLE revision.sessions ALTER COLUMN subject_id SET NOT NULL;
