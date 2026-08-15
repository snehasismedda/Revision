import express from 'express';
import {
    listTodos,
    createTodo,
    updateTodo,
    toggleTodoStatus,
    deleteTodo,
    listGroups,
    createGroup,
    updateGroup,
    deleteGroup,
} from '../controllers/todoController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });
router.use(authenticate);

// Groups routes
router.get('/groups', listGroups);
router.post('/groups', createGroup);
router.put('/groups/:groupId', updateGroup);
router.delete('/groups/:groupId', deleteGroup);

// Todos routes
router.get('/', listTodos);
router.post('/', createTodo);
router.put('/:todoId', updateTodo);
router.put('/:todoId/status', toggleTodoStatus);
router.delete('/:todoId', deleteTodo);

export default router;
