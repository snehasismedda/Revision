-- Up migration for create_system_prompts
CREATE TABLE revision.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES revision.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_prompts_user_id ON revision.system_prompts(user_id);
