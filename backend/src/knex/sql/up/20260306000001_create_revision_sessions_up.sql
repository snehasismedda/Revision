-- Up migration: create revision_sessions and revision_session_tracker
CREATE TABLE IF NOT EXISTS revision.revision_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES revision.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES revision.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revision.revision_session_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_session_id UUID NOT NULL REFERENCES revision.revision_sessions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES revision.topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (revision_session_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_revision_sessions_subject_user ON revision.revision_sessions (subject_id, user_id);
CREATE INDEX IF NOT EXISTS idx_revision_session_tracker_session ON revision.revision_session_tracker (revision_session_id);
