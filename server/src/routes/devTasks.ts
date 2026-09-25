
import { Router, Request, Response } from 'express';
import { authenticateAdminAllowViewerWrites, requireRole } from '../middleware/adminAuth';
import { DevTask, type DevTaskStatus, type DevTaskType } from '../models/DevTask';

const router = Router();
router.use(authenticateAdminAllowViewerWrites);

const VALID_TYPES: DevTaskType[] = ['feature', 'bug', 'change'];
const VALID_STATUSES: DevTaskStatus[] = ['open', 'in_progress', 'done', 'closed'];

router.get('/', requireRole('admin', 'super_admin'), async (_req: Request, res: Response) => {
  const tasks = await DevTask.find().sort({ createdAt: -1 }).lean();
  res.json(tasks);
});

router.post(
  '/',
  requireRole('admin', 'super_admin', 'customer', 'viewer'),
  async (req: Request, res: Response) => {
    const { type, description, route, documentUrl, documentName } = req.body as {
      type?: string;
      description?: string;
      route?: string;
      documentUrl?: string;
      documentName?: string;
    };

    if (!type || !VALID_TYPES.includes(type as DevTaskType)) {
      res.status(400).json({ error: 'Invalid task type' });
      return;
    }

    const trimmedDescription = typeof description === 'string' ? description.trim() : '';
    const trimmedDocumentUrl = typeof documentUrl === 'string' ? documentUrl.trim() : '';
    if (!trimmedDescription && !trimmedDocumentUrl) {
      res.status(400).json({ error: 'description or document is required' });
      return;
    }

    const admin = req.admin!;
    const task = await DevTask.create({
      type,
      description: trimmedDescription.slice(0, 2000),
      status: 'open',
      createdBy: admin.email,
      createdByName: (req.body as { createdByName?: string }).createdByName?.trim().slice(0, 120),
      route: typeof route === 'string' ? route.slice(0, 200) : undefined,
      documentUrl: trimmedDocumentUrl.slice(0, 500) || undefined,
      documentName:
        typeof documentName === 'string' ? documentName.trim().slice(0, 200) : undefined,
    });

    res.status(201).json(task);
  },
);

router.patch('/:id', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as DevTaskStatus)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const task = await DevTask.findByIdAndUpdate(
    req.params.id,
    { status, updatedAt: new Date() },
    { new: true },
  );

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json(task);
});

export default router;
