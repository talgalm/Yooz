/**
 * Which activity DumbDumbBot should answer report questions about.
 *
 * Set by the admin statistics view while it is open; the bot reads it at send
 * time only, so this is a module variable rather than a context — nothing needs
 * to re-render when it changes.
 */
let currentActivityId: string | null = null;

export function setReportActivity(id: string | null): void {
  currentActivityId = id;
}

export function getReportActivity(): string | null {
  return currentActivityId;
}
