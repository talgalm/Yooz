import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { Mission } from '../models';

const router = Router();

// List all missions
router.get('/', authenticateAdmin, async (_req: Request, res: Response) => {
  const missions = await Mission.find().sort({ createdAt: -1 });
  res.json({ missions });
});

// Create mission
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  const { name, description, customer, explanationScreens } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Mission name is required (min 2 characters)' });
    return;
  }

  if (!explanationScreens || !Array.isArray(explanationScreens) || explanationScreens.length === 0) {
    res.status(400).json({ error: 'At least one explanation screen is required' });
    return;
  }

  const mission = await Mission.create({
    name: name.trim(),
    description: description?.trim(),
    customer: customer?.trim() || undefined,
    explanationScreens,
  });

  res.status(201).json({ mission });
});

// Get single mission
router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const mission = await Mission.findById(req.params.id);
  if (!mission) { res.status(404).json({ error: 'Mission not found' }); return; }
  res.json({ mission });
});

// Update mission
router.put('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const { name, description, customer, explanationScreens } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Mission name is required (min 2 characters)' });
    return;
  }

  const mission = await Mission.findByIdAndUpdate(
    req.params.id,
    {
      name: name.trim(),
      description: description?.trim(),
      customer: customer?.trim() || undefined,
      explanationScreens: explanationScreens || [],
    },
    { new: true, runValidators: true }
  );

  if (!mission) { res.status(404).json({ error: 'Mission not found' }); return; }
  res.json({ mission });
});

// Delete mission
router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const mission = await Mission.findByIdAndDelete(req.params.id);
  if (!mission) { res.status(404).json({ error: 'Mission not found' }); return; }
  res.json({ success: true });
});

export default router;
