import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerMongoFilter, customerOwnsDoc } from '../middleware/customerScope';
import { CreateStationRequest } from '../types';
import { Station, StationFolder } from '../models';

const router = Router();

router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const stations = await Station.find(customerMongoFilter(req)).sort({ createdAt: -1 });
  res.json({ stations });
});

router.post('/', authenticateAdmin, async (req: Request<{}, {}, CreateStationRequest>, res: Response) => {
  const { name, type, description, customer, theme, settings } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Station name is required (min 2 characters)' });
    return;
  }

  const stationType = type && ['text', 'video', 'image', 'narrative', 'badge', 'collage', 'feedback', 'riddle', 'avatar', 'avatarQuiz', 'enteringText'].includes(type) ? type : 'text';

  const tags = req.body.tags;
  const station = await Station.create({
    name: name.trim(),
    type: stationType,
    description: description?.trim(),
    customer: customer?.trim() || undefined,
    theme: theme?.trim() || undefined,
    tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
    settings: settings || {},
    createdByEmail: createdByEmailForNewResource(req),
  });

  res.status(201).json({ station });
});

router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const station = await Station.findById(req.params.id);
  if (!station) { res.status(404).json({ error: 'Station not found' }); return; }
  if (!customerOwnsDoc(req, station)) { res.status(404).json({ error: 'Station not found' }); return; }
  res.json({ station });
});

router.put('/:id', authenticateAdmin, async (req: Request<{ id: string }, {}, CreateStationRequest>, res: Response) => {
  const { name, type, description, customer, theme, settings } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Station name is required (min 2 characters)' });
    return;
  }

  const existing = await Station.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Station not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Station not found' }); return; }

  const stationType = type && ['text', 'video', 'image', 'narrative', 'badge', 'collage', 'feedback', 'riddle', 'avatar', 'avatarQuiz', 'enteringText'].includes(type) ? type : 'text';

  const tags = req.body.tags;
  const station = await Station.findByIdAndUpdate(
    req.params.id,
    {
      name: name.trim(),
      type: stationType,
      description: description?.trim(),
      customer: customer?.trim() || undefined,
      theme: theme?.trim() || undefined,
      tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
      settings: settings || {},
    },
    { new: true, runValidators: true }
  );

  if (!station) { res.status(404).json({ error: 'Station not found' }); return; }
  res.json({ station });
});

router.patch('/:id/folder', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const { folderId } = req.body as { folderId?: unknown };
  if (folderId !== null && typeof folderId !== 'string') {
    res.status(400).json({ error: 'folderId must be a string or null' });
    return;
  }

  const station = await Station.findById(req.params.id);
  if (!station || !customerOwnsDoc(req, station)) {
    res.status(404).json({ error: 'Station not found' });
    return;
  }

  if (folderId) {
    const folder = await StationFolder.findById(folderId);
    if (!folder || !customerOwnsDoc(req, folder)) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    station.folderId = folder._id;
  } else {
    station.folderId = null;
  }

  await station.save();
  res.json({ station });
});

router.post('/:id/duplicate', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Station.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Station not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Station not found' }); return; }

  const source = existing.toObject();
  const station = await Station.create({
    name: `${source.name} (עותק)`,
    type: source.type,
    description: source.description,
    customer: source.customer,
    theme: source.theme,
    tags: Array.isArray(source.tags) ? [...source.tags] : [],
    settings: source.settings || {},
    createdByEmail: createdByEmailForNewResource(req),
  });

  res.status(201).json({ station });
});

router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Station.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Station not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Station not found' }); return; }
  await Station.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
