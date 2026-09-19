import type { ManageNavPath } from './nav';

export const texts = {
  en: {
    'my-work': 'My Work',
    dashboard: 'Dashboard',
    clients: 'Clients',
    projects: 'Projects',
    tasks: 'Tasks',
    hours: 'Hours',
    calendar: 'Calendar',
    finance: 'Finance',
    reports: 'Reports',
    employees: 'Employees',
    settings: 'Settings',
  },
  he: {
    'my-work': 'העבודה שלי',
    dashboard: 'דשבורד',
    clients: 'לקוחות',
    projects: 'פרויקטים',
    tasks: 'משימות',
    hours: 'שעות',
    calendar: 'יומן',
    finance: 'כספים',
    reports: 'דוחות',
    employees: 'עובדים',
    settings: 'הגדרות',
  },
} satisfies Record<'en' | 'he', Record<ManageNavPath, string>>;
