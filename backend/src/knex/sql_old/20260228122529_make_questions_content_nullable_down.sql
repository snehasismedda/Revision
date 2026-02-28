-- Note: This might fail if there are rows with NULL content
-- In a real scenario, we'd need to provide default values or handle NULLs
ALTER TABLE revision.questions ALTER COLUMN content SET NOT NULL;
