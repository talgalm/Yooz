import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerOwnsDoc } from '../middleware/customerScope';
import { CustomTheme } from '../models';

const router = Router();

// GET /api/admin/themes — list all custom themes
router.get('/', authenticateAdmin, async (_req: Request, res: Response) => {
  const themes = await CustomTheme.find().sort({ createdAt: -1 }).lean();
  res.json({ themes });
});

// POST /api/admin/themes — create a new custom theme
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  const {
    name,
    mainColor,
    roadmapImage,
    stationsImage,
    textColor,
    bgColor,
    roadmapActiveNodeColor,
    roadmapPathColor,
    headerIconColor,
  } = req.body;
  if (!name || !mainColor) {
    res.status(400).json({ error: 'name and mainColor are required' });
    return;
  }
  const theme = await CustomTheme.create({
    name,
    mainColor,
    roadmapImage,
    stationsImage,
    textColor,
    bgColor,
    roadmapActiveNodeColor,
    roadmapPathColor,
    headerIconColor,
    createdByEmail: createdByEmailForNewResource(req),
  });
  res.status(201).json({ theme });
});

// PATCH /api/admin/themes/:id — update a custom theme
router.patch('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  const existing = await CustomTheme.findById(req.params.id).lean();
  if (!existing || !customerOwnsDoc(req, existing)) {
    res.status(404).json({ error: 'Theme not found' });
    return;
  }
  const {
    name,
    mainColor,
    roadmapImage,
    stationsImage,
    textColor,
    bgColor,
    roadmapActiveNodeColor,
    roadmapPathColor,
    headerIconColor,
  } = req.body;
  const theme = await CustomTheme.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name,
        mainColor,
        roadmapImage,
        stationsImage,
        textColor,
        bgColor,
        roadmapActiveNodeColor,
        roadmapPathColor,
        headerIconColor,
      },
    },
    { new: true, runValidators: true },
  ).lean();
  if (!theme) {
    res.status(404).json({ error: 'Theme not found' });
    return;
  }
  res.json({ theme });
});

// DELETE /api/admin/themes/:id — delete a custom theme
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  const existing = await CustomTheme.findById(req.params.id).lean();
  if (!existing || !customerOwnsDoc(req, existing)) {
    res.status(404).json({ error: 'Theme not found' });
    return;
  }
  await CustomTheme.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
