ALTER TABLE revision.subjects ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
