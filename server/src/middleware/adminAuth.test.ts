import { test } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { JWT_SECRET } from '../config';
import { authenticateAdmin, authenticateAdminAllowViewerWrites } from './adminAuth';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

function run(middleware: Middleware, method: string, authorization?: string) {
  const req = { method, headers: authorization ? { authorization } : {} } as unknown as Request;
  let status = 200;
  let passed = false;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  middleware(req, res, () => {
    passed = true;
  });
  return { status, passed };
}

const bearer = (role: string) => `Bearer ${jwt.sign({ email: `${role}@example.com`, role }, JWT_SECRET)}`;

// Run: npx tsx --test server/src/middleware/adminAuth.test.ts
test('a viewer can read', () => {
  for (const method of ['GET', 'HEAD']) {
    assert.strictEqual(run(authenticateAdmin, method, bearer('viewer')).passed, true, method);
  }
});

test('a viewer is refused every write', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const result = run(authenticateAdmin, method, bearer('viewer'));
    assert.deepStrictEqual(result, { status: 403, passed: false }, method);
  }
});

test('every other role can still write', () => {
  for (const role of ['customer', 'admin', 'super_admin']) {
    assert.strictEqual(run(authenticateAdmin, 'POST', bearer(role)).passed, true, role);
  }
});

test('the allow-writes gate lets a viewer report a problem, but still needs a valid token', () => {
  assert.strictEqual(run(authenticateAdminAllowViewerWrites, 'POST', bearer('viewer')).passed, true);
  assert.deepStrictEqual(run(authenticateAdminAllowViewerWrites, 'POST'), { status: 401, passed: false });
});

test('missing, forged and unknown-role tokens are refused', () => {
  assert.deepStrictEqual(run(authenticateAdmin, 'GET'), { status: 401, passed: false });
  const forged = `Bearer ${jwt.sign({ email: 'x@example.com', role: 'admin' }, 'not-the-secret')}`;
  assert.deepStrictEqual(run(authenticateAdmin, 'GET', forged), { status: 401, passed: false });
  assert.deepStrictEqual(run(authenticateAdmin, 'GET', bearer('manager')), { status: 403, passed: false });
});
