ALTER TABLE revision.questions ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES revision.questions(id) ON DELETE CASCADE;
