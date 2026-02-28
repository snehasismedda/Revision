CREATE TABLE revision.source_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES revision.subjects(id) ON DELETE CASCADE,
    data TEXT NOT NULL, -- Storing base64 for now as per current practice
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing source_image_id data as it references revision.questions, not revision.source_images
UPDATE revision.questions SET source_image_id = NULL;

-- Update source_image_id to reference revision.source_images instead of revision.questions
ALTER TABLE revision.questions DROP CONSTRAINT IF EXISTS revision.questions_source_image_id_fkey;
ALTER TABLE revision.questions ADD CONSTRAINT revision.questions_source_image_id_fkey 
    FOREIGN KEY (source_image_id) REFERENCES revision.source_images(id) ON DELETE SET NULL;
