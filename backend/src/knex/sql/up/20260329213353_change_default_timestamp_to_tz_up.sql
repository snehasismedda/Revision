-- Up migration for change_default_timestamp_to_tz
BEGIN;

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'revision'
          -- Select only columns that are currently timestamp without time zone
          AND data_type = 'timestamp without time zone'
    LOOP
        RAISE NOTICE 'Converting %.% column % from TIMESTAMP to TIMESTAMPTZ',
            rec.table_schema, rec.table_name, rec.column_name;

        -- Convert type
        EXECUTE format(
            'ALTER TABLE %I.%I 
             ALTER COLUMN %I TYPE TIMESTAMPTZ 
             USING %I AT TIME ZONE ''UTC''',
            rec.table_schema, rec.table_name, rec.column_name, rec.column_name
        );

        -- Set default to NOW()
        EXECUTE format(
            'ALTER TABLE %I.%I 
             ALTER COLUMN %I SET DEFAULT NOW()',
            rec.table_schema, rec.table_name, rec.column_name
        );
    END LOOP;
END $$;

COMMIT;