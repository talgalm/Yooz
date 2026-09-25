import { IClient } from '../models/manage/Client';
import { ManageRole } from '../models/manage/ManageUser';

export function serializeClient(doc: IClient, role: ManageRole) {
  if (role === 'owner') return doc;
  const plain = typeof (doc as { toObject?: unknown }).toObject === 'function'
    ? (doc as unknown as { toObject: () => IClient }).toObject()
    : doc;
  const { contract: _contract, ...rest } = plain as IClient & { contract?: unknown };
  return rest;
}
