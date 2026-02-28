ALTER TABLE revision.questions ADD COLUMN IF NOT EXISTS source_image_id UUID REFERENCES revision.questions(id) ON DELETE SET NULL;
