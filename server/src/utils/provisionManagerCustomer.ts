import bcrypt from 'bcryptjs';
import { User } from '../models';

export interface ManagerProvisionResult {
  ok: boolean;
  warning?: string;
}

export async function provisionManagerCustomer(
  email: string,
  plainPassword?: string,
): Promise<ManagerProvisionResult> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) {
    return { ok: false, warning: 'Manager email is empty' };
  }

  const existing = await User.findOne({ email: normalized });

  if (!existing) {
    if (!plainPassword) {
      return {
        ok: false,
        warning: 'Manager password is required to create a new customer account',
      };
    }
    await User.create({
      email: normalized,
      role: 'customer',
      password: await bcrypt.hash(plainPassword, 10),
    });
    return { ok: true };
  }

  if (existing.role !== 'customer') {
    return {
      ok: false,
      warning: `Email ${normalized} is already registered as ${existing.role}. Manager portal access still works; admin portal account was not created.`,
    };
  }

  if (plainPassword) {
    existing.password = await bcrypt.hash(plainPassword, 10);
    existing.updatedAt = new Date();
    await existing.save();
  }

  return { ok: true };
}
