
export type ClientDomain = 'tourism' | 'academia' | 'organization' | 'other';
export type ClientStatus = 'active' | 'prospect' | 'paused' | 'past' | 'irrelevant';
export type LeadSource = 'outbound' | 'referral' | 'website' | 'conference' | 'partner' | 'existing' | 'other';
export type InteractionType = 'call' | 'meeting' | 'email' | 'whatsapp' | 'demo' | 'other';

export const CLIENT_DOMAINS: ClientDomain[] = ['tourism', 'academia', 'organization', 'other'];
export const CLIENT_STATUSES: ClientStatus[] = ['active', 'prospect', 'paused', 'past', 'irrelevant'];
export const LEAD_SOURCES: LeadSource[] = ['outbound', 'referral', 'website', 'conference', 'partner', 'existing', 'other'];
export const INTERACTION_TYPES: InteractionType[] = ['call', 'meeting', 'email', 'whatsapp', 'demo', 'other'];

export interface Contact {
  _id: string;
  name: string;
  role?: string;
  phone?: string;
  officePhone?: string;
  email?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface Client {
  _id: string;
  name: string;
  domain: ClientDomain;
  status: ClientStatus;
  leadSource: LeadSource;
  website?: string;
  brief?: string;
  contacts: Contact[];
  contract?: {
    startDate?: string;
    endDate?: string;
    initialFee?: number;
    monthlyFee?: number;
    notes?: string;
  };
  lastContactDate?: string;
  nextActionText?: string;
  nextActionDate?: string;
  driveUrl?: string;
  tags: string[];
  notes?: string;
  archived: boolean;
  createdAt: string;
}

export interface Interaction {
  _id: string;
  clientId: string;
  contactId?: string;
  type: InteractionType;
  date: string;
  summary: string;
  userId?: { _id: string; name: string; color?: string };
  nextActionText?: string;
  nextActionDate?: string;
}

export function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toDateInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type ProjectType = 'client' | 'internal' | 'demo';
export type ProjectStatus =
  | 'planned' | 'active' | 'on_hold' | 'waiting_client' | 'done' | 'cancelled' | 'maintenance';
export type ProjectHealth = 'green' | 'orange' | 'red';
export type StageStatus = 'not_started' | 'in_progress' | 'done' | 'skipped';

export const PROJECT_TYPES: ProjectType[] = ['client', 'internal', 'demo'];
export const PROJECT_STATUSES: ProjectStatus[] = [
  'planned', 'active', 'on_hold', 'waiting_client', 'done', 'cancelled', 'maintenance',
];
export const STAGE_STATUSES: StageStatus[] = ['not_started', 'in_progress', 'done', 'skipped'];

export interface Stage {
  key: string;
  name: string;
  order: number;
  plannedHours: number;
  status: StageStatus;
  plannedStartDate?: string;
  plannedEndDate?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ProjectHours {
  plannedHours: number;
  actualHours: number;
  utilization: number;
  remainingHours: number;
  overrunHours: number;
}

export interface Project {
  _id: string;
  name: string;
  type: ProjectType;
  clientId?: string;
  clientName?: string;
  primaryContactId?: string;
  description?: string;
  status: ProjectStatus;
  stages: Stage[];
  currentStageKey?: string;
  pmUserId: string;
  memberUserIds: string[];
  startDate?: string;
  targetDate?: string;
  goLiveDate?: string;
  closedAt?: string;
  plannedHours: number;
  recurring: { enabled: boolean; monthlyAmount?: number; billingDay?: number; autoRenew?: boolean };
  agreedPrice?: number;
  currency?: string;
  health: ProjectHealth;
  healthReason?: string;
  driveUrl?: string;
  tags: string[];
  archived: boolean;
  hours?: ProjectHours;
}

export interface TeamMember {
  _id: string;
  name: string;
  color?: string;
  role: string;
}

export const HEALTH_COLORS: Record<ProjectHealth, string> = {
  green: '#2e7d32',
  orange: '#ed6c02',
  red: '#c62828',
};

export function isClosed(status: ProjectStatus): boolean {
  return status === 'done' || status === 'cancelled';
}

export type TimeCategory =
  | 'client_project' | 'infrastructure' | 'demo' | 'content'
  | 'sales' | 'marketing' | 'admin' | 'support' | 'bizdev';

export const TIME_CATEGORIES: TimeCategory[] = [
  'client_project', 'infrastructure', 'demo', 'content',
  'sales', 'marketing', 'admin', 'support', 'bizdev',
];

export const CATEGORIES_REQUIRING_PROJECT: TimeCategory[] = [
  'client_project', 'infrastructure', 'demo', 'content',
];

export interface TimeEntry {
  _id: string;
  userId: string | { _id: string; name: string; color?: string };
  date: string;
  minutes: number;
  category: TimeCategory;
  projectId?: string | { _id: string; name: string };
  note?: string;
  source: 'timer' | 'manual';
  startedAt?: string;
  endedAt?: string;
  afterProjectClose: boolean;
  locked: boolean;
  autoStopped: boolean;
  costAmount?: number;
}

export interface MonthDay {
  date: string;
  minutes: number;
  entries: TimeEntry[];
}

export interface MonthSheetData {
  month: string;
  userId: string;
  days: MonthDay[];
  totalMinutes: number;
  daysWorked: number;
}

export function refName(v: unknown): string | undefined {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return undefined;
}

export function refColor(v: unknown): string | undefined {
  if (v && typeof v === 'object' && 'color' in v) return (v as { color?: string }).color;
  return undefined;
}

export function refId(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && '_id' in v) return String((v as { _id: string })._id);
  return undefined;
}

export function weekStart(d: Date = new Date()): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'needs_approval' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'waiting', 'needs_approval', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#c62828',
  high: '#ed6c02',
  normal: '#6c5ce7',
  low: '#8d86a3',
};

export interface TaskComment {
  _id: string;
  userId: string | { _id: string; name: string; color?: string };
  text: string;
  createdAt: string;
}

export interface Task {
  _id: string;
  projectId?: string | { _id: string; name: string };
  clientId?: string | { _id: string; name: string };
  title: string;
  description?: string;
  assigneeUserId: string | { _id: string; name: string; color?: string };
  watcherUserIds: string[];
  status: TaskStatus;
  priority: TaskPriority;
  plannedHours: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  visibleToAll?: boolean;
  checklist: { text: string; done: boolean }[];
  comments: TaskComment[];
  archived: boolean;
}

export function overdueDays(task: Pick<Task, 'dueDate' | 'status'>): number | null {
  if (!task.dueDate || task.status === 'done') return null;
  const due = new Date(task.dueDate);
  const today = new Date();
  const days = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / 86_400_000,
  );
  return days > 0 ? days : null;
}

export function isDueToday(task: Pick<Task, 'dueDate' | 'status'>): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  const d = new Date(task.dueDate);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  key: string;
  severity: AlertSeverity;
  title: string;
  entityType: string;
  entityId: string;
  href: string;
  ageDays?: number;
}

export interface DashboardData {
  role: string;
  alerts: Alert[];
  my: { openTasks: number; overdueTasks: number; weekHours: number };
  business?: {
    activeProjects: number;
    health: { green: number; orange: number; red: number };
    activeClients: number;
    openTasks: number;
  };
}

export type CalendarKind =
  | 'task_due' | 'meeting' | 'next_action'
  | 'project_start' | 'project_target' | 'project_go_live';

export interface CalendarEvent {
  date: string;
  kind: CalendarKind;
  title: string;
  entityType: string;
  entityId: string;
  href: string;
  color?: string;
}

export const CALENDAR_COLORS: Record<CalendarKind, string> = {
  task_due: '#6c5ce7',
  meeting: '#0984e3',
  next_action: '#00b894',
  project_start: '#8d86a3',
  project_target: '#ed6c02',
  project_go_live: '#2e7d32',
};

export type ExpenseCategory =
  | 'freelancer' | 'graphics' | 'ai_api' | 'hosting' | 'content' | 'travel' | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'freelancer', 'graphics', 'ai_api', 'hosting', 'content', 'travel', 'other',
];

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'done';
export const CHANGE_REQUEST_STATUSES: ChangeRequestStatus[] =
  ['pending', 'approved', 'rejected', 'done'];

export interface Expense {
  _id: string;
  projectId: string | { _id: string; name: string };
  date: string;
  category: ExpenseCategory;
  vendor?: string;
  amount: number;
  description?: string;
  billable: boolean;
}

export interface ChangeRequest {
  _id: string;
  projectId: string;
  date: string;
  requestedByName?: string;
  description: string;
  estimatedHours: number;
  additionalPrice: number;
  status: ChangeRequestStatus;
  appliedToBudget: boolean;
}

export interface ProjectMoney {
  laborCost: number;
  expenseTotal: number;
  totalCost: number;
  oneTimeRevenue: number;
  recurringToDate: number;
  revenue: number;
  grossProfit: number;
  margin: number;
  effectiveRatePerHour: number;
  excludesManagementHours: boolean;
}

export interface MonthMoney {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface FinanceSummary {
  month: string;
  totals: { revenue: number; cost: number; profit: number };
  mrr: number;
  arr: number;
  monthLaborCost: number;
  projects: (ProjectMoney & {
    _id: string; name: string; type: string; status: string;
    clientName?: string; actualHours: number;
  })[];
  internalInvestment: {
    totalCost: number;
    hours: number;
    rows: (ProjectMoney & { _id: string; name: string; actualHours: number })[];
  };
  endingSoon: { _id: string; name: string; clientName?: string; endDate: string }[];
  excludesManagementHours: boolean;
}

export function formatMoney(n: number): string {
  return `${Math.round(n).toLocaleString('he-IL')} ₪`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 1000) / 10}%`;
}
