import { Request } from 'express';
import { Game, Station, Mission } from '../models';

export function isCustomerRole(req: Request): boolean {
  return req.admin?.role === 'customer';
}

export function customerOwnerEmail(req: Request): string | null {
  if (!req.admin?.email) return null;
  return req.admin.email.toLowerCase().trim();
}

export function customerMongoFilter(req: Request): Record<string, unknown> {
  if (!isCustomerRole(req)) return {};
  const email = customerOwnerEmail(req);
  if (!email) return { _id: { $exists: false } };
  const managerEmail = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return { $or: [{ createdByEmail: email }, { managerEmail }] };
}

export function customerOwnsDoc(
  req: Request,
  doc: { createdByEmail?: string; managerEmail?: string } | null | undefined,
): boolean {
  if (!doc) return false;
  if (!isCustomerRole(req)) return true;
  const email = customerOwnerEmail(req);
  if (!email) return false;
  return doc.createdByEmail === email || doc.managerEmail?.toLowerCase() === email;
}

export function customerIsAssignedManager(
  req: Request,
  doc: { createdByEmail?: string; managerEmail?: string } | null | undefined,
): boolean {
  if (!doc || !isCustomerRole(req)) return false;
  const email = customerOwnerEmail(req);
  if (!email) return false;
  return doc.managerEmail?.toLowerCase() === email && doc.createdByEmail !== email;
}

export function createdByEmailForNewResource(req: Request): string {
  return customerOwnerEmail(req) || 'unknown';
}

export async function assertModuleOwnedByCustomer(
  req: Request,
  moduleConfig: unknown,
  activity?: ({ createdByEmail?: string; managerEmail?: string; module?: { items?: Array<{ ref?: unknown }>; missionRef?: unknown } }) | null,
): Promise<string | null> {
  if (!isCustomerRole(req)) return null;
  if (activity && customerIsAssignedManager(req, activity)) return null;
  const email = customerOwnerEmail(req);
  if (!email) return 'Unauthorized';

  if (!moduleConfig || typeof moduleConfig !== 'object') return null;
  const mod = moduleConfig as {
    type?: string;
    missionRef?: string;
    items?: Array<{ type: string; ref: string }>;
  };

  const existingRefs = new Set<string>();
  for (const it of activity?.module?.items || []) {
    if (it?.ref) existingRefs.add(String(it.ref));
  }
  if (activity?.module?.missionRef) existingRefs.add(String(activity.module.missionRef));

  if (mod.type === 'mission' && mod.missionRef) {
    if (existingRefs.has(String(mod.missionRef))) return null;
    const m = await Mission.findById(mod.missionRef).lean();
    if (!m || !customerOwnsDoc(req, m as { createdByEmail?: string })) {
      return 'Mission reference not found or access denied';
    }
    return null;
  }

  for (const item of mod.items || []) {
    if (!item?.ref) continue;
    if (existingRefs.has(String(item.ref))) continue;
    if (item.type === 'game') {
      const g = await Game.findById(item.ref).lean();
      if (!g || !customerOwnsDoc(req, g as { createdByEmail?: string })) {
        return 'Game reference not found or access denied';
      }
    } else if (item.type === 'station') {
      const s = await Station.findById(item.ref).lean();
      if (!s || !customerOwnsDoc(req, s as { createdByEmail?: string })) {
        return 'Station reference not found or access denied';
      }
    } else if (item.type === 'mission') {
      const m = await Mission.findById(item.ref).lean();
      if (!m || !customerOwnsDoc(req, m as { createdByEmail?: string })) {
        return 'Mission reference not found or access denied';
      }
    }
  }
  return null;
}
