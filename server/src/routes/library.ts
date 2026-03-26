import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { LibraryItem, Game, Station } from '../models';

const router = Router();

// List library items (with optional filters)
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const kind = req.query.kind as string;     // 'game' | 'station'
  const type = req.query.type as string;     // e.g. 'trivia', 'video'
  const tag = req.query.tag as string;
  const q = ((req.query.q as string) || '').trim();
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (kind) filter.kind = kind;
  if (type) filter.type = type;
  if (tag) filter.tags = tag;

  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: regex },
      { description: regex },
      { customer: regex },
      { tags: regex },
    ];
  }

  const [items, total] = await Promise.all([
    LibraryItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    LibraryItem.countDocuments(filter),
  ]);

  res.json({ items, total });
});

// Get all unique tags
router.get('/tags', authenticateAdmin, async (_req: Request, res: Response) => {
  const tags = await LibraryItem.distinct('tags');
  res.json({ tags: tags.sort() });
});

// Get single library item
router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const item = await LibraryItem.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Library item not found' }); return; }
  res.json({ item });
});

// Copy library item → real Game or Station (apply to activity)
router.post('/:id/copy', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const item = await LibraryItem.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Library item not found' }); return; }

  if (item.kind === 'game') {
    const game = await Game.create({
      name: item.name,
      type: item.type,
      description: item.description,
      customer: item.customer,
      tags: [...item.tags.filter(t => t !== 'imported'), 'from-library'],
      settings: item.settings,
    });
    res.status(201).json({ created: 'game', game });
  } else {
    const station = await Station.create({
      name: item.name,
      type: item.type,
      description: item.description,
      customer: item.customer,
      tags: [...item.tags.filter(t => t !== 'imported'), 'from-library'],
      settings: item.settings,
    });
    res.status(201).json({ created: 'station', station });
  }
});

// Delete library item
router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const item = await LibraryItem.findByIdAndDelete(req.params.id);
  if (!item) { res.status(404).json({ error: 'Library item not found' }); return; }
  res.json({ success: true });
});

export default router;
