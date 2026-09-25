import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  customerMongoFilter,
  customerOwnsDoc,
  createdByEmailForNewResource,
} from '../middleware/customerScope';
import { Mission, MissionFolder, FOLDER_COLOR_HEXES, DEFAULT_FOLDER_COLOR } from '../models';
import { logAdminAction } from './admin';

const router = Router();

const VALID_COLORS = FOLDER_COLOR_HEXES as unknown as string[];

router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const folders = await MissionFolder.find(customerMongoFilter(req)).sort({ name: 1 }).lean();
  res.json({ folders });
});

router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  const { name, color } = req.body as { name?: unknown; color?: unknown };
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    res.status(400).json({ error: 'Folder name is required' });
    return;
  }
  let folderColor: string = DEFAULT_FOLDER_COLOR;
  if (color !== undefined) {
    if (typeof color !== 'string' || !VALID_COLORS.includes(color)) {
      res.status(400).json({ error: 'Invalid folder color' });
      return;
    }
    folderColor = color;
  }

  const folder = await MissionFolder.create({
    name: trimmed,
    color: folderColor,
    createdByEmail: createdByEmailForNewResource(req),
  });
  logAdminAction(req, 'create_mission_folder', 'mission_folder', folder._id.toString(), folder.name);
  res.status(201).json({ folder });
});

router.patch('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const folder = await MissionFolder.findById(req.params.id);
  if (!folder || !customerOwnsDoc(req, folder)) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const { name, color } = req.body as { name?: unknown; color?: unknown };
  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }
    folder.name = trimmed;
  }
  if (color !== undefined) {
    if (typeof color !== 'string' || !VALID_COLORS.includes(color)) {
      res.status(400).json({ error: 'Invalid folder color' });
      return;
    }
    folder.color = color;
  }

  await folder.save();
  logAdminAction(req, 'update_mission_folder', 'mission_folder', folder._id.toString(), folder.name);
  res.json({ folder });
});

router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const folder = await MissionFolder.findById(req.params.id);
  if (!folder || !customerOwnsDoc(req, folder)) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  await MissionFolder.findByIdAndDelete(folder._id);
  await Mission.updateMany({ folderId: folder._id }, { $set: { folderId: null } });
  logAdminAction(req, 'delete_mission_folder', 'mission_folder', folder._id.toString(), folder.name);
  res.json({ success: true });
});

export default router;
