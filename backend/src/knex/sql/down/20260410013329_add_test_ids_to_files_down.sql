ALTER TABLE revision.files DROP COLUMN test_series_id;
ALTER TABLE revision.files ALTER COLUMN subject_id SET NOT NULL;
