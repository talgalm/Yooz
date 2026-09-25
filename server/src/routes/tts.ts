import { Router, Request, Response } from 'express';
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '../config';
import { createRateLimiter } from '../utils/participantRateLimit';

const router = Router();

const isRateLimited = createRateLimiter({
  perParticipant: 60,
  perAnonymous: 30,
  perAddress: 400,
});

const VOICE_MAP = {
  man: 'he-IL-AvriNeural',
  woman: 'he-IL-HilaNeural',
} as const;

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

router.post('/', async (req: Request, res: Response) => {
  if (isRateLimited(req)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    res.status(503).json({ error: 'TTS service not configured' });
    return;
  }

  const { text, voiceType } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  const safeText = text.trim().slice(0, 1000);
  const voice = voiceType === 'woman' ? VOICE_MAP.woman : VOICE_MAP.man;

  const ssml = `<speak version='1.0' xml:lang='he-IL'><voice xml:lang='he-IL' name='${voice}'>${escapeSsml(safeText)}</voice></speak>`;

  const url = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const azureRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'yooz-app',
      },
      body: ssml,
      signal: controller.signal,
    });

    if (!azureRes.ok) {
      const errText = await azureRes.text().catch(() => '');
      console.error(`Azure TTS error: ${azureRes.status} ${errText}`);
      res.status(502).json({ error: 'TTS provider error' });
      return;
    }

    const buffer = Buffer.from(await azureRes.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (err) {
    console.error('TTS endpoint error:', err);
    res.status(502).json({ error: 'TTS request failed' });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
