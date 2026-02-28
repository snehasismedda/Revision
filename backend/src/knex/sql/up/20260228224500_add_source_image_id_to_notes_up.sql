ALTER TABLE revision.notes 
ADD COLUMN source_image_id UUID REFERENCES revision.source_images(id) ON DELETE SET NULL;
