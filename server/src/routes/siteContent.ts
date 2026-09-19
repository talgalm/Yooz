import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { SiteContent, DEFAULT_SITE_CONTENT, ContactLead } from '../models';

const router = Router();

/** Returns the singleton content doc, creating it from defaults on first access. */
async function getOrCreateContent() {
  let doc = await SiteContent.findOne();
  if (!doc) doc = await SiteContent.create(DEFAULT_SITE_CONTENT);
  return doc;
}

/**
 * Pure validation reused by the route and the self-check script.
 *
 * Phone is optional: the marketing site's contact form collects name, email and
 * company only, matching the design. Leads submitted through other surfaces may
 * still carry a phone, so the field is kept on the model.
 */
export function validateLead(body: Partial<{ name: string; email: string; phone: string }>): string | null {
  if (!body.name || !body.name.trim()) return 'Name is required';
  if (!body.email || !body.email.trim()) return 'Email is required';
  return null;
}

// ─── Public ───

// GET /api/site-content — public read of the marketing site content
router.get('/', async (_req: Request, res: Response) => {
  const doc = await getOrCreateContent();
  res.json({ content: doc });
});

// POST /api/site-content/leads — public contact-form submission
router.post('/leads', async (req: Request, res: Response) => {
  const error = validateLead(req.body);
  if (error) { res.status(400).json({ error }); return; }
  const { name, company, position, email, phone, message } = req.body;
  await ContactLead.create({ name, company, position, email, phone, message });
  res.status(201).json({ ok: true });
});

// ─── Admin (admin + super_admin only) ───

// PUT /api/site-content — replace the content doc
router.put('/', authenticateAdmin, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: 'Missing content' }); return; }
  delete content._id; // immutable — can't be in the update payload
  delete content.__v;
  content.updatedAt = new Date();
  const doc = await SiteContent.findOneAndUpdate({}, content, { new: true, upsert: true });
  res.json({ content: doc });
});

// GET /api/site-content/leads — list submissions, newest first
router.get('/leads', authenticateAdmin, requireRole('admin', 'super_admin'), async (_req: Request, res: Response) => {
  const leads = await ContactLead.find().sort({ createdAt: -1 });
  res.json({ leads });
});

// PATCH /api/site-content/leads/:id — toggle handled flag
router.patch('/leads/:id', authenticateAdmin, requireRole('admin', 'super_admin'), async (req: Request<{ id: string }>, res: Response) => {
  const lead = await ContactLead.findByIdAndUpdate(req.params.id, { handled: !!req.body.handled }, { new: true });
  if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }
  res.json({ lead });
});

export default router;
