export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<SmsSendResult>;
}

export class StubSmsProvider implements SmsProvider {
  readonly name = 'stub';

  async send(to: string, message: string): Promise<SmsSendResult> {
    const providerMessageId = `stub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    console.log('[SMS stub] ─────────────────────────────');
    console.log(`[SMS stub] To: ${to}`);
    console.log(`[SMS stub] Message: ${message}`);
    console.log(`[SMS stub] ID: ${providerMessageId}`);
    console.log('[SMS stub] ─────────────────────────────');
    return { success: true, providerMessageId };
  }
}

let activeProvider: SmsProvider = new StubSmsProvider();

export function getSmsProvider(): SmsProvider {
  return activeProvider;
}

export function setSmsProvider(provider: SmsProvider): void {
  activeProvider = provider;
}
