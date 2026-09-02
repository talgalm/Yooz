/**
 * The whole /manage menu, in one place. Short on purpose — the spec's rule is
 * "one short main menu, not dozens of modules".
 * `ownerOnly` items are a UI convenience; the real gate is requireManageRole on the server.
 */
export interface ManageNavItem {
  path: string;
  labelHe: string;
  labelEn: string;
  ownerOnly?: boolean;
}

export const MANAGE_NAV: ManageNavItem[] = [
  { path: 'my-work', labelHe: 'העבודה שלי', labelEn: 'My Work' },
  { path: 'dashboard', labelHe: 'דשבורד', labelEn: 'Dashboard' },
  { path: 'clients', labelHe: 'לקוחות', labelEn: 'Clients' },
  { path: 'projects', labelHe: 'פרויקטים', labelEn: 'Projects' },
  { path: 'tasks', labelHe: 'משימות', labelEn: 'Tasks' },
  { path: 'hours', labelHe: 'שעות', labelEn: 'Hours' },
  { path: 'calendar', labelHe: 'יומן', labelEn: 'Calendar' },
  { path: 'finance', labelHe: 'כספים', labelEn: 'Finance', ownerOnly: true },
  { path: 'reports', labelHe: 'דוחות', labelEn: 'Reports' },
  { path: 'employees', labelHe: 'עובדים', labelEn: 'Employees' },
  { path: 'settings', labelHe: 'הגדרות', labelEn: 'Settings', ownerOnly: true },
];
