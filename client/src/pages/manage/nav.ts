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
