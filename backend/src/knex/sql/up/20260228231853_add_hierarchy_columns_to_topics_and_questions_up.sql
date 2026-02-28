-- Up migration for add_hierarchy_columns_to_topics_and_questions
ALTER TABLE revision.topics ADD COLUMN depth INTEGER DEFAULT 0;
ALTER TABLE revision.topics ADD COLUMN sort_order INTEGER DEFAULT 0;
