-- Down migration for remove_topic_id_from_questions
ALTER TABLE revision.questions ADD COLUMN topic_id UUID;
