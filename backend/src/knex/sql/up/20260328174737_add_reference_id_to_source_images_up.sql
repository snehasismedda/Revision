-- Up migration for add_reference_id_to_source_images
ALTER TABLE revision.source_images 
ADD COLUMN reference_id VARCHAR(50) UNIQUE;

CREATE INDEX idx_source_images_reference_id ON revision.source_images(reference_id);
