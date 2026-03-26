import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { CreateGameRequest } from '../types';
import { Game } from '../models';

const router = Router();

// List all games
router.get('/', authenticateAdmin, async (_req: Request, res: Response) => {
  const games = await Game.find().sort({ createdAt: -1 });
  res.json({ games });
});

// Create game
router.post('/', authenticateAdmin, async (req: Request<{}, {}, CreateGameRequest>, res: Response) => {
  const { name, type, description, customer, theme, tags, settings } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Game name is required (min 2 characters)' });
    return;
  }

  const game = await Game.create({
    name: name.trim(),
    type: type || 'generic',
    description: description?.trim(),
    customer: customer?.trim() || undefined,
    theme: theme?.trim() || undefined,
    tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
    settings: settings || {},
  });

  res.status(201).json({ game });
});

// Get single game
router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const game = await Game.findById(req.params.id);
  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  res.json({ game });
});

// Update game
router.put('/:id', authenticateAdmin, async (req: Request<{ id: string }, {}, CreateGameRequest>, res: Response) => {
  const { name, type, description, customer, theme, settings } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Game name is required (min 2 characters)' });
    return;
  }

  const tags = req.body.tags;
  const game = await Game.findByIdAndUpdate(
    req.params.id,
    { name: name.trim(), type: type || 'generic', description: description?.trim(), customer: customer?.trim() || undefined, theme: theme?.trim() || undefined, tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [], settings: settings || {} },
    { new: true, runValidators: true }
  );

  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  res.json({ game });
});

// Delete game
router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const game = await Game.findByIdAndDelete(req.params.id);
  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  res.json({ success: true });
});

export default router;
