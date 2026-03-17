-- Up migration for remove_topic_id_from_questions
ALTER TABLE revision.questions DROP COLUMN IF EXISTS topic_id;
