import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerMongoFilter, customerOwnsDoc } from '../middleware/customerScope';
import { CreateGameRequest } from '../types';
import { Game, GameFolder } from '../models';

const router = Router();

router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const games = await Game.find(customerMongoFilter(req)).sort({ createdAt: -1 });
  res.json({ games });
});

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
    createdByEmail: createdByEmailForNewResource(req),
  });

  res.status(201).json({ game });
});

router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const game = await Game.findById(req.params.id);
  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  if (!customerOwnsDoc(req, game)) { res.status(404).json({ error: 'Game not found' }); return; }
  res.json({ game });
});

router.put('/:id', authenticateAdmin, async (req: Request<{ id: string }, {}, CreateGameRequest>, res: Response) => {
  const { name, type, description, customer, theme, settings } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Game name is required (min 2 characters)' });
    return;
  }

  const existing = await Game.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Game not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Game not found' }); return; }

  const tags = req.body.tags;
  const game = await Game.findByIdAndUpdate(
    req.params.id,
    { name: name.trim(), type: type || 'generic', description: description?.trim(), customer: customer?.trim() || undefined, theme: theme?.trim() || undefined, tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [], settings: settings || {} },
    { new: true, runValidators: true }
  );

  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  res.json({ game });
});

router.patch('/:id/folder', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const { folderId } = req.body as { folderId?: unknown };
  if (folderId !== null && typeof folderId !== 'string') {
    res.status(400).json({ error: 'folderId must be a string or null' });
    return;
  }

  const game = await Game.findById(req.params.id);
  if (!game || !customerOwnsDoc(req, game)) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (folderId) {
    const folder = await GameFolder.findById(folderId);
    if (!folder || !customerOwnsDoc(req, folder)) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    game.folderId = folder._id;
  } else {
    game.folderId = null;
  }

  await game.save();
  res.json({ game });
});

router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Game.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Game not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Game not found' }); return; }
  await Game.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
