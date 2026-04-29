import { Router, Request, Response } from 'express';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';

const router = Router();

interface FieldCheck {
  userAnswer: string;
  rightAnswer: string;
  keywordsBank?: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function checkSemantic(userAnswer: string, rightAnswer: string, keywordsBank?: string): Promise<boolean> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  let prompt = `You are a quiz answer checker.\n\nCorrect answer: "${rightAnswer}"\nPlayer's answer: "${userAnswer}"\n`;
  if (keywordsBank?.trim()) {
    prompt += `Acceptable keywords/synonyms: ${keywordsBank}\n`;
  }
  prompt += `\nDoes the player's answer convey the same meaning as the correct answer? Consider minor spelling variations, extra spaces, synonyms, and partial matches if keywords are provided. Reply with exactly one word: "yes" or "no".`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 10 },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim().toLowerCase().startsWith('yes');
  } finally {
    clearTimeout(timeout);
  }
}

router.post('/', async (req: Request, res: Response) => {
  const { fields } = req.body as { fields: FieldCheck[] };

  if (!Array.isArray(fields) || fields.length === 0) {
    res.status(400).json({ error: 'fields required' });
    return;
  }

  try {
    const results = await Promise.all(
      fields.map(async (f) => {
        if (!f.rightAnswer?.trim()) return true;
        if (normalize(f.userAnswer) === normalize(f.rightAnswer)) return true;
        return checkSemantic(f.userAnswer, f.rightAnswer, f.keywordsBank);
      })
    );
    res.json({ results });
  } catch (err) {
    console.error('check-answer error:', err);
    res.status(500).json({ error: 'check failed' });
  }
});

export default router;
