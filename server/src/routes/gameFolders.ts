import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  customerMongoFilter,
  customerOwnsDoc,
  createdByEmailForNewResource,
} from '../middleware/customerScope';
import { Game, GameFolder, FOLDER_COLOR_HEXES, DEFAULT_FOLDER_COLOR } from '../models';
import { logAdminAction } from './admin';

const router = Router();

const VALID_COLORS = FOLDER_COLOR_HEXES as unknown as string[];

// GET /api/admin/game-folders — list folders (customer-scoped, sorted by name).
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  const folders = await GameFolder.find(customerMongoFilter(req)).sort({ name: 1 }).lean();
  res.json({ folders });
});

// POST /api/admin/game-folders — create a folder
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

  const folder = await GameFolder.create({
    name: trimmed,
    color: folderColor,
    createdByEmail: createdByEmailForNewResource(req),
  });
  logAdminAction(req, 'create_game_folder', 'game_folder', folder._id.toString(), folder.name);
  res.status(201).json({ folder });
});

// PATCH /api/admin/game-folders/:id — rename / recolor a folder
router.patch('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const folder = await GameFolder.findById(req.params.id);
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
  logAdminAction(req, 'update_game_folder', 'game_folder', folder._id.toString(), folder.name);
  res.json({ folder });
});

// DELETE /api/admin/game-folders/:id — delete a folder; member games return to ungrouped.
router.delete('/:id', authenticateAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const folder = await GameFolder.findById(req.params.id);
  if (!folder || !customerOwnsDoc(req, folder)) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  await GameFolder.findByIdAndDelete(folder._id);
  await Game.updateMany({ folderId: folder._id }, { $set: { folderId: null } });
  logAdminAction(req, 'delete_game_folder', 'game_folder', folder._id.toString(), folder.name);
  res.json({ success: true });
});

export default router;
