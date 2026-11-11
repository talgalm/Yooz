export const SCAN_CODE_LENGTH = 6;
export const SCAN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SCAN_PAYLOAD_PREFIX = 'YOOZ:';

export type ScanRewardType = 'message' | 'image' | 'video';

export interface ScanStationSettings {
  code: string;
  title: string;
  instructions: string;
  rewardType: ScanRewardType;
  rewardTitle: string;
  rewardText: string;
  rewardMediaUrl: string;
  continueButtonText: string;
}

function randomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function newScanCode(bytes: (count: number) => Uint8Array = randomBytes): string {
  return Array.from(bytes(SCAN_CODE_LENGTH), (b) => SCAN_CODE_ALPHABET[b % SCAN_CODE_ALPHABET.length]).join('');
}

export function normalizeScanCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  const withoutPrefix = upper.startsWith(SCAN_PAYLOAD_PREFIX) ? upper.slice(SCAN_PAYLOAD_PREFIX.length) : upper;
  return withoutPrefix.replace(/[^A-Z0-9]/g, '');
}

export function scanPayload(code: string): string {
  return `${SCAN_PAYLOAD_PREFIX}${normalizeScanCode(code)}`;
}

export function matchesScanCode(scanned: string, code: string): boolean {
  const expected = normalizeScanCode(code);
  return expected.length > 0 && normalizeScanCode(scanned) === expected;
}

export function emptyScanSettings(code: string = newScanCode()): ScanStationSettings {
  return {
    code,
    title: '',
    instructions: '',
    rewardType: 'message',
    rewardTitle: '',
    rewardText: '',
    rewardMediaUrl: '',
    continueButtonText: '',
  };
}

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');

export function scanSettingsFrom(raw: Record<string, unknown> | undefined): ScanStationSettings {
  const settings = raw ?? {};
  const code = normalizeScanCode(textOf(settings.code));
  const rewardType = settings.rewardType === 'image' || settings.rewardType === 'video' ? settings.rewardType : 'message';
  return {
    code,
    title: textOf(settings.title),
    instructions: textOf(settings.instructions),
    rewardType,
    rewardTitle: textOf(settings.rewardTitle),
    rewardText: textOf(settings.rewardText),
    rewardMediaUrl: rewardType === 'message' ? '' : textOf(settings.rewardMediaUrl),
    continueButtonText: textOf(settings.continueButtonText),
  };
}

export function scanSettingsToSave(settings: ScanStationSettings): Record<string, unknown> {
  const saved: Record<string, unknown> = {
    code: normalizeScanCode(settings.code),
    rewardType: settings.rewardType,
  };
  const optional: Array<[string, string]> = [
    ['title', settings.title],
    ['instructions', settings.instructions],
    ['rewardTitle', settings.rewardTitle],
    ['rewardText', settings.rewardText],
    ['continueButtonText', settings.continueButtonText],
  ];
  if (settings.rewardType !== 'message') optional.push(['rewardMediaUrl', settings.rewardMediaUrl]);
  for (const [key, value] of optional) {
    if (value.trim()) saved[key] = value.trim();
  }
  return saved;
}
