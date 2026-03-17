-- Down migration for add_is_deleted_to_source_images
ALTER TABLE revision.source_images DROP COLUMN is_deleted;
ALTER TABLE revision.source_images DROP COLUMN deleted_at;
