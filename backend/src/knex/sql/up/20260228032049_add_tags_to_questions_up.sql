ALTER TABLE revision.questions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
