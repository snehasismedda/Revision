-- Up migration for create_test_series_tables

-- 1. Test Series
CREATE TABLE revision.test_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Test Series Subjects Join Table
CREATE TABLE revision.test_series_subjects (
    test_series_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (test_series_id, subject_id)
);

-- 3. Tests
CREATE TABLE revision.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_series_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    test_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Test Subjects Join Table
CREATE TABLE revision.test_subjects (
    test_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (test_id, subject_id)
);

-- 5. Test Results
CREATE TABLE revision.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL,
    session_ids JSONB,
    my_score NUMERIC,
    total_score NUMERIC,
    total_qs INTEGER,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
