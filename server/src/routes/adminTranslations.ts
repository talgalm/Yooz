import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { Game, Station } from '../models';
import { collectProse, translationsFor } from '../services/contentTranslation';
import { normaliseLang, SUPPORTED_LANGS } from '../utils/requestLang';

const router = Router();

type Kind = 'stations' | 'games';

const findOne = (kind: Kind, id: string) => (kind === 'stations' ? Station.findById(id) : Game.findById(id));
const findOneLean = (kind: Kind, id: string) => (kind === 'stations' ? Station.findById(id).lean() : Game.findById(id).lean());

function isKind(raw: string): raw is Kind {
  return raw === 'stations' || raw === 'games';
}

function translatableParts(doc: { name?: string; description?: string; settings?: unknown }) {
  return { name: doc.name, description: doc.description, settings: doc.settings };
}

router.get('/:kind/:id', authenticateAdmin, async (req: Request<{ kind: string; id: string }>, res: Response) => {
  const { kind, id } = req.params;
  if (!isKind(kind)) {
    res.status(404).json({ error: 'Unknown content type' });
    return;
  }

  const lang = normaliseLang(req.query.lang);
  if (lang === 'he') {
    res.status(400).json({ error: 'Hebrew is the source language' });
    return;
  }

  const doc = await findOneLean(kind, id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const sources = [...collectProse(translatableParts(doc))];
  const machine = await translationsFor(sources, lang);
  const reviewed = (doc.translations?.[lang] ?? {}) as Record<string, string>;

  res.json({
    lang,
    name: doc.name,
    rows: sources.map((source) => ({
      source,
      machine: machine.get(source) ?? null,
      reviewed: reviewed[source] ?? null,
    })),
  });
});

router.put('/:kind/:id', authenticateAdmin, async (req: Request<{ kind: string; id: string }>, res: Response) => {
  const { kind, id } = req.params;
  if (!isKind(kind)) {
    res.status(404).json({ error: 'Unknown content type' });
    return;
  }

  const lang = normaliseLang(req.body?.lang);
  if (lang === 'he' || !(SUPPORTED_LANGS as readonly string[]).includes(lang)) {
    res.status(400).json({ error: 'Unsupported language' });
    return;
  }

  const incoming = req.body?.reviewed;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    res.status(400).json({ error: 'reviewed must be an object of source -> translation' });
    return;
  }

  const cleaned: Record<string, string> = {};
  for (const [source, value] of Object.entries(incoming as Record<string, unknown>)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed && trimmed !== source) cleaned[source] = trimmed;
  }

  const doc = await findOne(kind, id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const translations = { ...(doc.translations ?? {}) };
  if (Object.keys(cleaned).length > 0) translations[lang] = cleaned;
  else delete translations[lang];

  doc.set('translations', Object.keys(translations).length > 0 ? translations : undefined);
  await doc.save();

  res.json({ lang, count: Object.keys(cleaned).length });
});

export default router;
