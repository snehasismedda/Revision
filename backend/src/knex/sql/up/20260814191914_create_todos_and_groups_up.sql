-- Up migration for create_todos_and_groups
CREATE TABLE IF NOT EXISTS revision.todo_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES revision.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES revision.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#8b5cf6',
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revision.todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES revision.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES revision.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES revision.todo_groups(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES revision.todos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todo_groups_subject_user ON revision.todo_groups(subject_id, user_id);
CREATE INDEX IF NOT EXISTS idx_todos_subject_user ON revision.todos(subject_id, user_id);
CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON revision.todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_todos_group_id ON revision.todos(group_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON revision.todos(status);
