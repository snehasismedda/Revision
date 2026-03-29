-- Up migration for add_source_image_ids_to_notes
ALTER TABLE revision.notes 
ADD COLUMN source_image_ids UUID[] DEFAULT '{}';
