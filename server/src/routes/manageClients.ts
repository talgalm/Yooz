import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import {
  Client,
  CLIENT_DOMAINS,
  CLIENT_STATUSES,
  LEAD_SOURCES,
  ClientDomain,
  ClientStatus,
  LeadSource,
} from '../models/manage/Client';
import { Interaction, INTERACTION_TYPES, InteractionType } from '../models/manage/Interaction';
import { Project } from '../models/manage/Project';

const router = Router();

// Everything below needs a manage token. Editing clients is pm/owner;
// a member may read and log interactions (permission matrix, ch.02).
router.use(authenticateManage);

const canEdit = requireManageRole('owner', 'pm');

function badId(res: Response, id: string): boolean {
  if (Types.ObjectId.isValid(id)) return false;
  res.status(400).json({ error: 'Invalid id' });
  return true;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whitelist of client-writable fields — never spread req.body into a document. */
function pickClientFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['name', 'website', 'driveUrl', 'notes', 'nextActionText']) {
    if (typeof body[k] === 'string') out[k] = (body[k] as string).trim();
  }

  if (CLIENT_DOMAINS.includes(body.domain as ClientDomain)) out.domain = body.domain;
  if (CLIENT_STATUSES.includes(body.status as ClientStatus)) out.status = body.status;
  if (LEAD_SOURCES.includes(body.leadSource as LeadSource)) out.leadSource = body.leadSource;
  if (Array.isArray(body.tags)) out.tags = (body.tags as unknown[]).filter((t) => typeof t === 'string');
  if (typeof body.archived === 'boolean') out.archived = body.archived;
  if (body.nextActionDate === null) out.nextActionDate = undefined;
  else if (typeof body.nextActionDate === 'string' && body.nextActionDate) {
    out.nextActionDate = new Date(body.nextActionDate);
  }
  if (typeof body.ownerUserId === 'string' && Types.ObjectId.isValid(body.ownerUserId)) {
    out.ownerUserId = body.ownerUserId;
  }
  return out;
}

function pickContactFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['name', 'role', 'phone', 'email', 'notes']) {
    if (typeof body[k] === 'string') out[k] = (body[k] as string).trim();
  }
  if (typeof body.isPrimary === 'boolean') out.isPrimary = body.isPrimary;
  return out;
}

// ─── Clients ───

router.get('/', async (req: Request, res: Response) => {
  const { status, domain, q, archived } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { archived: archived === 'true' };
  if (status && CLIENT_STATUSES.includes(status as ClientStatus)) filter.status = status;
  if (domain && CLIENT_DOMAINS.includes(domain as ClientDomain)) filter.domain = domain;
  if (q && q.trim()) filter.name = { $regex: escapeRegex(q.trim()), $options: 'i' };

  // Oldest contact first — the list doubles as the "who have we forgotten" screen.
  // Never-contacted clients sort first, which is the correct kind of loud.
  const clients = await Client.find(filter).sort({ lastContactDate: 1, name: 1 }).lean();
  res.json({ clients });
});

router.post('/', canEdit, async (req: Request, res: Response) => {
  const fields = pickClientFields(req.body ?? {});
  if (!fields.name) {
    res.status(400).json({ error: 'Client name is required' });
    return;
  }
  const client = await Client.create({ ...fields, createdBy: req.manageUser!.userId });
  res.status(201).json({ client });
});

router.get('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const client = await Client.findById(String(req.params.id)).lean();
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  res.json({ client });
});

router.patch('/:id', canEdit, async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const fields = pickClientFields(req.body ?? {});
  if ('name' in fields && !fields.name) {
    res.status(400).json({ error: 'Client name is required' });
    return;
  }
  const client = await Client.findByIdAndUpdate(String(req.params.id), fields, { new: true });
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  res.json({ client });
});

// Owner only. Removes the client and the interactions that hang off it —
// orphaned interactions would otherwise linger with a dead clientId.
// A client with projects is NOT deletable: the projects carry hours and money,
// and stranding them would be worse than keeping a row nobody wants.
router.delete('/:id', requireManageRole('owner'), async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;

  const projectCount = await Project.countDocuments({ clientId: String(req.params.id) });
  if (projectCount > 0) {
    res.status(409).json({ error: 'has_projects', projectCount });
    return;
  }

  const client = await Client.findByIdAndDelete(String(req.params.id));
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  await Interaction.deleteMany({ clientId: client._id });
  res.json({ ok: true });
});

// ─── Contacts (embedded in the client) ───

router.post('/:id/contacts', canEdit, async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const fields = pickContactFields(req.body ?? {});
  if (!fields.name) {
    res.status(400).json({ error: 'Contact name is required' });
    return;
  }
  const client = await Client.findById(String(req.params.id));
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  // At most one primary contact per client.
  if (fields.isPrimary) client.contacts.forEach((c) => { c.isPrimary = false; });
  client.contacts.push(fields as never);
  await client.save();
  res.status(201).json({ client });
});

router.patch('/:id/contacts/:contactId', canEdit, async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id)) || badId(res, String(req.params.contactId))) return;
  const client = await Client.findById(String(req.params.id));
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  const contact = client.contacts.find((c) => c._id.toString() === String(req.params.contactId));
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }
  const fields = pickContactFields(req.body ?? {});
  if (fields.isPrimary) client.contacts.forEach((c) => { c.isPrimary = false; });
  Object.assign(contact, fields);
  await client.save();
  res.json({ client });
});

router.delete('/:id/contacts/:contactId', canEdit, async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id)) || badId(res, String(req.params.contactId))) return;
  const client = await Client.findById(String(req.params.id));
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  client.contacts = client.contacts.filter((c) => c._id.toString() !== String(req.params.contactId)) as never;
  await client.save();
  res.json({ client });
});

// ─── Interactions ───

router.get('/:id/interactions', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const interactions = await Interaction.find({ clientId: String(req.params.id) })
    .sort({ date: -1, createdAt: -1 })
    .populate('userId', 'name color')
    .lean();
  res.json({ interactions });
});

// Logging contact is open to every role — the member who had the call must be
// able to record it, or lastContactDate silently rots.
router.post('/:id/interactions', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const client = await Client.findById(String(req.params.id));
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!INTERACTION_TYPES.includes(body.type as InteractionType)) {
    res.status(400).json({ error: 'Invalid interaction type' });
    return;
  }
  if (typeof body.summary !== 'string' || !body.summary.trim()) {
    res.status(400).json({ error: 'Summary is required' });
    return;
  }
  const date = body.date ? new Date(body.date as string) : new Date();
  if (Number.isNaN(date.getTime())) {
    res.status(400).json({ error: 'Invalid date' });
    return;
  }

  const nextActionText = typeof body.nextActionText === 'string' && body.nextActionText.trim()
    ? body.nextActionText.trim()
    : undefined;
  const nextActionDate = typeof body.nextActionDate === 'string' && body.nextActionDate
    ? new Date(body.nextActionDate)
    : undefined;

  const interaction = await Interaction.create({
    clientId: client._id,
    contactId: typeof body.contactId === 'string' && Types.ObjectId.isValid(body.contactId)
      ? body.contactId
      : undefined,
    type: body.type as InteractionType,
    date,
    summary: (body.summary as string).trim(),
    userId: req.manageUser!.userId,
    nextActionText,
    nextActionDate,
    nextActionUserId: nextActionText ? req.manageUser!.userId : undefined,
  });

  // "Last contact" is derived here, on write. A back-dated entry must not pull
  // the date backwards, so only a later date moves it.
  if (!client.lastContactDate || date > client.lastContactDate) client.lastContactDate = date;
  if (nextActionText) {
    client.nextActionText = nextActionText;
    client.nextActionDate = nextActionDate;
    client.nextActionUserId = new Types.ObjectId(req.manageUser!.userId);
  }
  await client.save();

  res.status(201).json({ interaction, client });
});

export default router;
