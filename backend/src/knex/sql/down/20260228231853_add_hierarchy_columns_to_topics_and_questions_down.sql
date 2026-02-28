-- Down migration for add_hierarchy_columns_to_topics_and_questions
ALTER TABLE revision.topics DROP COLUMN depth;
ALTER TABLE revision.topics DROP COLUMN sort_order;
