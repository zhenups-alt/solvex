import { Router } from 'express';
import { getApiStatus } from '../controllers/status.controller.js';

const statusRouter = Router();

statusRouter.get('/status', getApiStatus);

export default statusRouter;
