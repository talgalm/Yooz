import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { Mission } from '../models';

const router = Router();

// List all missions (read-only)
router.get('/', authenticateAdmin, async (_req: Request, res: Response) => {
  const missions = await Mission.find().sort({ createdAt: -1 });
  res.json({ missions });
});

// Get single mission (read-only)
router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const mission = await Mission.findById(req.params.id);
  if (!mission) { res.status(404).json({ error: 'Mission not found' }); return; }
  res.json({ mission });
});

export default router;
