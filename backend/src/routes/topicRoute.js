import express from 'express';
import { getTopics, createTopic, bulkCreateTopics, updateTopic, deleteTopic } from '../controllers/topicController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getTopics);
router.post('/', createTopic);
router.post('/bulk', bulkCreateTopics);
router.put('/:id', updateTopic);
router.delete('/:id', deleteTopic);

export default router;
