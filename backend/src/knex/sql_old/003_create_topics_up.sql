CREATE TABLE revision.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES revision.subjects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES revision.topics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
