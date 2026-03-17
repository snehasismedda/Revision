-- Up migration for add_is_deleted_to_source_images
ALTER TABLE revision.source_images ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE revision.source_images ADD COLUMN deleted_at TIMESTAMP;
