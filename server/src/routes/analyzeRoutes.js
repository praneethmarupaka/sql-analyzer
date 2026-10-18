import { Router } from 'express';
import { analyzeQuery } from '../controllers/analyzerController.js';

const router = Router();

router.post('/analyze', analyzeQuery);

export default router;
