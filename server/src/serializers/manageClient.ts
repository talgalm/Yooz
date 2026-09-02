import { IClient } from '../models/manage/Client';
import { ManageRole } from '../models/manage/ManageUser';

/**
 * The ONLY shape a client leaves the server in.
 *
 * `contract` carries the agreed fees, so it follows the same rule as a
 * project's price: owner only, decided here rather than in the UI. Everything
 * else about a client — including the first-meeting brief — is open to the team.
 */
export function serializeClient(doc: IClient, role: ManageRole) {
  if (role === 'owner') return doc;
  // Callers hand us both lean objects and hydrated documents; spreading the
  // latter without toObject() would leak Mongoose internals instead of fields.
  const plain = typeof (doc as { toObject?: unknown }).toObject === 'function'
    ? (doc as unknown as { toObject: () => IClient }).toObject()
    : doc;
  const { contract: _contract, ...rest } = plain as IClient & { contract?: unknown };
  return rest;
}
