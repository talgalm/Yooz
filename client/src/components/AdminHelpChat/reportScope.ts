let currentActivityId: string | null = null;

export function setReportActivity(id: string | null): void {
  currentActivityId = id;
}

export function getReportActivity(): string | null {
  return currentActivityId;
}
