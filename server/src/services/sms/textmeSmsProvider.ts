import { SmsProvider, SmsSendResult } from './smsProvider';

const TEXTME_ENDPOINT = 'https://my.textme.co.il/api';

interface TextmeResponse {
  status?: number;
  message?: string;
  shipment_id?: string | number;
}

function normalizeIsraeliPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('972')) return `0${digits.slice(3)}`;
  if (digits.startsWith('0')) return digits;
  if (digits.startsWith('5')) return `0${digits}`;
  return digits;
}

export class TextmeSmsProvider implements SmsProvider {
  readonly name = 'textme';

  constructor(
    private readonly token: string,
    private readonly username: string,
    private readonly source: string,
  ) {}

  async send(to: string, message: string): Promise<SmsSendResult> {
    const phone = normalizeIsraeliPhone(to);
    if (!phone) {
      return { success: false, error: 'Empty phone number' };
    }

    const body = {
      sms: {
        user: { username: this.username },
        source: this.source,
        destinations: { phone },
        message,
      },
    };

    try {
      const res = await fetch(TEXTME_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let parsed: TextmeResponse | null = null;
      try {
        parsed = text ? (JSON.parse(text) as TextmeResponse) : null;
      } catch {
      }

      if (!res.ok) {
        return {
          success: false,
          error: `HTTP ${res.status}: ${parsed?.message || text.slice(0, 200) || res.statusText}`,
        };
      }

      if (parsed && parsed.status !== undefined && parsed.status !== 0) {
        return {
          success: false,
          error: `textme status ${parsed.status}: ${parsed.message || 'unknown error'}`,
        };
      }

      return {
        success: true,
        providerMessageId: parsed?.shipment_id ? String(parsed.shipment_id) : undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'textme request failed',
      };
    }
  }
}
