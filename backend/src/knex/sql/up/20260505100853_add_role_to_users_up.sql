-- Up migration for add_role_to_users
ALTER TABLE revision.users ADD COLUMN role VARCHAR(50) DEFAULT 'student';
