ALTER TABLE revision.files ADD COLUMN test_series_id UUID REFERENCES revision.test_series(id) ON DELETE CASCADE;
ALTER TABLE revision.files ALTER COLUMN subject_id DROP NOT NULL;
