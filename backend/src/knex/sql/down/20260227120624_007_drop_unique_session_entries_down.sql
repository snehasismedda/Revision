ALTER TABLE revision.session_entries ADD CONSTRAINT revision.session_entries_session_id_topic_id_unique UNIQUE(session_id, topic_id);
