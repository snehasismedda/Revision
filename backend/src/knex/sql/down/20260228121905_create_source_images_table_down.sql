ALTER TABLE revision.questions DROP CONSTRAINT IF EXISTS revision.questions_source_image_id_fkey;
ALTER TABLE revision.questions ADD CONSTRAINT revision.questions_source_image_id_fkey 
    FOREIGN KEY (source_image_id) REFERENCES revision.questions(id) ON DELETE SET NULL;

DROP TABLE IF EXISTS revision.source_images;
