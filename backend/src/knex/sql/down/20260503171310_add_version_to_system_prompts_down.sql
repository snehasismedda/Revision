-- Down migration for add version to system prompts
ALTER TABLE revision.system_prompts DROP COLUMN version;
