import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createdByEmailForNewResource, customerOwnsDoc } from '../middleware/customerScope';
import { CustomTheme } from '../models';

const router = Router();

router.get('/', authenticateAdmin, async (_req: Request, res: Response) => {
  const themes = await CustomTheme.find().sort({ createdAt: -1 }).lean();
  res.json({ themes });
});

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
