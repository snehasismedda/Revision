-- Down migration for add_profile_picture_to_users
ALTER TABLE revision.users DROP COLUMN IF EXISTS profile_picture;
