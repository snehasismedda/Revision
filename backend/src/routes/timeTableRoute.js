import express from 'express';
import * as TimeTableController from '../controllers/timeTableController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', TimeTableController.getTimeTables);
router.post('/', TimeTableController.createTimeTable);
router.get('/:id', TimeTableController.getTimeTableById);
router.put('/:id', TimeTableController.updateTimeTable);
router.delete('/:id', TimeTableController.deleteTimeTable);
router.post('/:id/active', TimeTableController.setActiveTimeTable);
router.patch('/:id/active', TimeTableController.toggleActiveTimeTable);

export default router;
