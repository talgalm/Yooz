/**
 * The whole /manage menu, in one place. Short on purpose — the spec's rule is
 * "one short main menu, not dozens of modules".
 * `ownerOnly` items are a UI convenience; the real gate is requireManageRole on the server.
 * Labels live in `nav.i18n.ts`, keyed by `path`.
 */
/** Spelled out so the compiler catches a label the i18n file forgot. */
export type ManageNavPath =
  | 'my-work'
  | 'dashboard'
  | 'clients'
  | 'projects'
  | 'tasks'
  | 'hours'
  | 'calendar'
  | 'finance'
  | 'reports'
  | 'employees'
  | 'settings';

export interface ManageNavItem {
  path: ManageNavPath;
  ownerOnly?: boolean;
}

export const MANAGE_NAV: readonly ManageNavItem[] = [
  { path: 'my-work' },
  { path: 'dashboard' },
  { path: 'clients' },
  { path: 'projects' },
  { path: 'tasks' },
  { path: 'hours' },
  { path: 'calendar' },
  { path: 'finance', ownerOnly: true },
  { path: 'reports', ownerOnly: true },
  { path: 'employees', ownerOnly: true },
  { path: 'settings', ownerOnly: true },
];
