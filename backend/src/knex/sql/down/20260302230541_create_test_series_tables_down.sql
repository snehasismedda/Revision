-- Down migration for create_test_series_tables

DROP TABLE IF EXISTS revision.test_results;
DROP TABLE IF EXISTS revision.test_subjects;
DROP TABLE IF EXISTS revision.tests;
DROP TABLE IF EXISTS revision.test_series_subjects;
DROP TABLE IF EXISTS revision.test_series;
