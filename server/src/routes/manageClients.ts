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
import { serializeClient } from '../serializers/manageClient';

const router = Router();

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

function pickClientFields(body: Record<string, unknown>, role: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['name', 'website', 'driveUrl', 'notes', 'brief', 'nextActionText']) {
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

  if (role === 'owner' && typeof body.contract === 'object' && body.contract !== null) {
    const c = body.contract as Record<string, unknown>;
    const contract: Record<string, unknown> = {};
    for (const k of ['startDate', 'endDate']) {
      if (typeof c[k] === 'string' && c[k]) {
        const d = new Date(c[k] as string);
        if (!Number.isNaN(d.getTime())) contract[k] = d;
      }
    }
    for (const k of ['initialFee', 'monthlyFee']) {
      if (Number.isFinite(Number(c[k])) && Number(c[k]) >= 0) contract[k] = Number(c[k]);
    }
    if (typeof c.notes === 'string') contract.notes = c.notes.trim();
    out.contract = contract;
  }
  return out;
}

function pickContactFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['name', 'role', 'phone', 'officePhone', 'email', 'notes']) {
    if (typeof body[k] === 'string') out[k] = (body[k] as string).trim();
  }
  if (typeof body.isPrimary === 'boolean') out.isPrimary = body.isPrimary;
  return out;
}

router.get('/', async (req: Request, res: Response) => {
  const { status, domain, q, archived } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { archived: archived === 'true' };
  if (status && CLIENT_STATUSES.includes(status as ClientStatus)) filter.status = status;
  if (domain && CLIENT_DOMAINS.includes(domain as ClientDomain)) filter.domain = domain;
  if (q && q.trim()) filter.name = { $regex: escapeRegex(q.trim()), $options: 'i' };

  const clients = await Client.find(filter).sort({ lastContactDate: 1, name: 1 }).lean();
  res.json({ clients: clients.map((c) => serializeClient(c as never, req.manageUser!.role)) });
});

router.post('/', canEdit, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const fields = pickClientFields(body, req.manageUser!.role);
  if (!fields.name) {
    res.status(400).json({ error: 'Client name is required' });
    return;
  }
  const contacts = Array.isArray(body.contacts)
    ? (body.contacts as Record<string, unknown>[])
      .map(pickContactFields)
      .filter((c) => typeof c.name === 'string' && c.name)
    : [];
  if (contacts.length && !contacts.some((c) => c.isPrimary)) contacts[0].isPrimary = true;

  const client = await Client.create({ ...fields, contacts, createdBy: req.manageUser!.userId });
  res.status(201).json({ client: serializeClient(client as never, req.manageUser!.role) });
});

router.get('/:id', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const client = await Client.findById(String(req.params.id)).lean();
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  res.json({ client: serializeClient(client as never, req.manageUser!.role) });
});

router.patch('/:id', canEdit, async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const fields = pickClientFields(req.body ?? {}, req.manageUser!.role);
  if ('name' in fields && !fields.name) {
    res.status(400).json({ error: 'Client name is required' });
    return;
  }
  const client = await Client.findByIdAndUpdate(String(req.params.id), fields, { new: true });
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  res.json({ client: serializeClient(client as never, req.manageUser!.role) });
});

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
  if (fields.isPrimary) client.contacts.forEach((c) => { c.isPrimary = false; });
  client.contacts.push(fields as never);
  await client.save();
  res.status(201).json({ client: serializeClient(client as never, req.manageUser!.role) });
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
  res.json({ client: serializeClient(client as never, req.manageUser!.role) });
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
  res.json({ client: serializeClient(client as never, req.manageUser!.role) });
});

router.get('/:id/interactions', async (req: Request, res: Response) => {
  if (badId(res, String(req.params.id))) return;
  const interactions = await Interaction.find({ clientId: String(req.params.id) })
    .sort({ date: -1, createdAt: -1 })
    .populate('userId', 'name color')
    .lean();
  res.json({ interactions });
});

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
