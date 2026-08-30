-- Up migration for add version to system prompts
ALTER TABLE revision.system_prompts ADD COLUMN version VARCHAR(20) DEFAULT '1.0';
