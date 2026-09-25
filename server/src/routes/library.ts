import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerMongoFilter, customerOwnsDoc } from '../middleware/customerScope';
import { LibraryItem, Game, Station } from '../models';

const router = Router();

router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const kind = req.query.kind as string;
  const type = req.query.type as string;
  const tagParam = req.query.tag;
  const tags: string[] = Array.isArray(tagParam) ? tagParam as string[] : tagParam ? [tagParam as string] : [];
  const customer = req.query.customer as string;
  const q = ((req.query.q as string) || '').trim();
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  const filter: any = {};
  if (kind) filter.kind = kind;
  if (type) filter.type = type;
  if (tags.length === 1) filter.tags = tags[0];
  else if (tags.length > 1) filter.tags = { $all: tags };
  if (customer) filter.customer = customer;

  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: regex },
      { description: regex },
      { customer: regex },
      { tags: regex },
    ];
  }

  const scope = customerMongoFilter(req);
  const listFilter = Object.keys(scope).length > 0
    ? (Object.keys(filter).length > 0 ? { $and: [filter, scope] } : scope)
    : filter;

  const [items, total] = await Promise.all([
    LibraryItem.find(listFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    LibraryItem.countDocuments(listFilter),
  ]);

  res.json({ items, total });
});

router.get('/tags', authenticateAdmin, async (req: Request, res: Response) => {
  const scope = customerMongoFilter(req);
  const match = Object.keys(scope).length > 0 ? scope : {};
  const [tags, customers, types] = await Promise.all([
    LibraryItem.distinct('tags', match),
    LibraryItem.distinct('customer', match),
    LibraryItem.distinct('type', match),
  ]);
  res.json({
    tags: tags.sort(),
    customers: customers.filter(Boolean).sort(),
    types: types.filter(Boolean).sort(),
  });
});

router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const item = await LibraryItem.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Library item not found' }); return; }
  if (!customerOwnsDoc(req, item)) { res.status(404).json({ error: 'Library item not found' }); return; }
  res.json({ item });
});

router.post('/:id/copy', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const item = await LibraryItem.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Library item not found' }); return; }

  if (!customerOwnsDoc(req, item)) { res.status(404).json({ error: 'Library item not found' }); return; }

  if (item.kind === 'game') {
    const game = await Game.create({
      name: item.name,
      type: item.type,
      description: item.description,
      customer: item.customer,
      tags: [...item.tags.filter(t => t !== 'imported'), 'from-library'],
      settings: item.settings,
      createdByEmail: createdByEmailForNewResource(req),
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
      createdByEmail: createdByEmailForNewResource(req),
    });
    res.status(201).json({ created: 'station', station });
  }
});

router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await LibraryItem.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Library item not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Library item not found' }); return; }
  await LibraryItem.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
