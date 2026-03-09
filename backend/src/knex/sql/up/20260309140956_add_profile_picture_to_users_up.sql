-- Up migration for add_profile_picture_to_users
ALTER TABLE revision.users ADD COLUMN profile_picture TEXT;
