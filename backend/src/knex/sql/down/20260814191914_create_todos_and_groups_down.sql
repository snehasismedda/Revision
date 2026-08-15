-- Down migration for create_todos_and_groups
DROP TABLE IF EXISTS revision.todos CASCADE;
DROP TABLE IF EXISTS revision.todo_groups CASCADE;
