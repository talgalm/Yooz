import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerMongoFilter, customerOwnsDoc } from '../middleware/customerScope';
import { CreateStationRequest } from '../types';
import { Station } from '../models';

const router = Router();

// List all stations
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const stations = await Station.find(customerMongoFilter(req)).sort({ createdAt: -1 });
  res.json({ stations });
});

// Create station
router.post('/', authenticateAdmin, async (req: Request<{}, {}, CreateStationRequest>, res: Response) => {
  const { name, type, description, customer, theme, settings } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Station name is required (min 2 characters)' });
    return;
  }

  const stationType = type && ['text', 'video', 'image', 'narrative', 'badge', 'collage', 'feedback'].includes(type) ? type : 'text';

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

// Get single station
router.get('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const station = await Station.findById(req.params.id);
  if (!station) { res.status(404).json({ error: 'Station not found' }); return; }
  if (!customerOwnsDoc(req, station)) { res.status(404).json({ error: 'Station not found' }); return; }
  res.json({ station });
});

// Update station
router.put('/:id', authenticateAdmin, async (req: Request<{ id: string }, {}, CreateStationRequest>, res: Response) => {
  const { name, type, description, customer, theme, settings } = req.body;

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Station name is required (min 2 characters)' });
    return;
  }

  const existing = await Station.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Station not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Station not found' }); return; }

  const stationType = type && ['text', 'video', 'image', 'narrative', 'badge', 'collage', 'feedback'].includes(type) ? type : 'text';

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

// Delete station
router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await Station.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Station not found' }); return; }
  if (!customerOwnsDoc(req, existing)) { res.status(404).json({ error: 'Station not found' }); return; }
  await Station.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
