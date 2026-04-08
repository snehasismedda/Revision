-- Down migration for change_default_timestamp_to_tz
BEGIN;

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'revision'
          -- Revert only columns that are currently timestamp with time zone
          AND data_type = 'timestamp with time zone'
    LOOP
        RAISE NOTICE 'Reverting %.% column % from TIMESTAMPTZ back to TIMESTAMP',
            rec.table_schema, rec.table_name, rec.column_name;

        -- Revert type
        EXECUTE format(
            'ALTER TABLE %I.%I 
             ALTER COLUMN %I TYPE TIMESTAMP 
             USING %I AT TIME ZONE ''UTC''',
            rec.table_schema, rec.table_name, rec.column_name, rec.column_name
        );

        -- Restore old default
        EXECUTE format(
            'ALTER TABLE %I.%I 
             ALTER COLUMN %I SET DEFAULT CURRENT_TIMESTAMP',
            rec.table_schema, rec.table_name, rec.column_name
        );
    END LOOP;
END $$;

COMMIT;

