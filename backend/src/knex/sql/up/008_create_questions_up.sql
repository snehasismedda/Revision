CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES revision.subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES revision.topics(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type VARCHAR(10) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
