-- Drop any possible names for the old constraint pointing to 'revision.questions'
ALTER TABLE revision.questions DROP CONSTRAINT IF EXISTS revision.questions_source_image_id_fkey;
ALTER TABLE revision.questions DROP CONSTRAINT IF EXISTS revision.questions_source_image_id_foreign;

-- Ensure it points to 'revision.source_images'
ALTER TABLE revision.questions ADD CONSTRAINT revision.questions_source_image_id_fkey 
    FOREIGN KEY (source_image_id) REFERENCES revision.source_images(id) ON DELETE SET NULL;
