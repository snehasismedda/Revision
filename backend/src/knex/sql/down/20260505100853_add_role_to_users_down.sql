-- Down migration for add_role_to_users
ALTER TABLE revision.users DROP COLUMN role;
