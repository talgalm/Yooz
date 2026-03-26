import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerMongoFilter, customerOwnsDoc } from '../middleware/customerScope';
import { Mission } from '../models';

const router = Router();

router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const missions = await Mission.find(customerMongoFilter(req)).sort({ createdAt: -1 });
  res.json({ missions });
});

router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const mission = await Mission.findById(req.params.id);
  if (!mission) { res.status(404).json({ error: 'Mission not found' }); return; }
  if (!customerOwnsDoc(req, mission)) { res.status(404).json({ error: 'Mission not found' }); return; }
  res.json({ mission });
});

router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  const { name, description, customer, explanationScreens, puzzleConfig, trashSortConfig } = req.body;
  if (!name || String(name).trim().length < 2) {
    res.status(400).json({ error: 'Mission name is required (min 2 characters)' });
    return;
  }
  const mission = await Mission.create({
    name: name.trim(),
    description: description?.trim() || undefined,
    customer: customer?.trim() || undefined,
    explanationScreens: Array.isArray(explanationScreens) ? explanationScreens : [],
    puzzleConfig: puzzleConfig || undefined,
    trashSortConfig: trashSortConfig || undefined,
    createdByEmail: createdByEmailForNewResource(req),
  });
  res.status(201).json({ mission });
});

router.put('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Mission.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Mission not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Mission not found' }); return; }

  const { name, description, customer, explanationScreens, puzzleConfig, trashSortConfig } = req.body;
  if (!name || String(name).trim().length < 2) {
    res.status(400).json({ error: 'Mission name is required (min 2 characters)' });
    return;
  }
  const mission = await Mission.findByIdAndUpdate(
    req.params.id,
    {
      name: name.trim(),
      description: description?.trim() || undefined,
      customer: customer?.trim() || undefined,
      explanationScreens: Array.isArray(explanationScreens) ? explanationScreens : [],
      puzzleConfig: puzzleConfig || undefined,
      trashSortConfig: trashSortConfig || undefined,
    },
    { new: true, runValidators: true },
  );
  res.json({ mission });
});

router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Mission.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Mission not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Mission not found' }); return; }
  await Mission.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
