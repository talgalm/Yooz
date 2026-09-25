/**
 * Reviewing what the machine wrote: every translatable string in a station or
 * game next to its machine translation, with corrections stored on the document
 * itself. A correction is keyed by the exact Hebrew it replaces, so editing the
 * Hebrew retires the correction written for that wording.
 */
import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { Activity, Game, Station } from '../models';
import { cachedTranslations, collectProse, translationsFor } from '../services/contentTranslation';
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

/**
 * The same counts rolled up across an activity's content, for its language
 * picker. Registered before the `:kind` routes, which would otherwise swallow
 * `/activity/...` and answer 404.
 */
router.get(
  '/activity/:id/languages',
  authenticateAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const activity = await Activity.findById(req.params.id).select('languages module').lean();
    if (!activity) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const items = activity.module?.items ?? [];
    const idsOf = (type: string) => items.filter((i) => i.type === type).map((i) => i.ref);
    const [stations, games] = await Promise.all([
      Station.find({ _id: { $in: idsOf('station') } }).select('translations').lean(),
      Game.find({ _id: { $in: idsOf('game') } }).select('translations').lean(),
    ]);

    const reviewed: Record<string, number> = {};
    for (const doc of [...stations, ...games]) {
      const stored = (doc.translations ?? {}) as Record<string, Record<string, string>>;
      for (const [lang, corrections] of Object.entries(stored)) {
        reviewed[lang] = (reviewed[lang] ?? 0) + Object.keys(corrections ?? {}).length;
      }
    }

    const enabled = new Set(activity.languages ?? []);
    const codes = new Set<string>([
      ...SUPPORTED_LANGS.filter((code) => code !== 'he'),
      ...Object.keys(reviewed),
    ]);

    res.json({
      languages: [...codes].map((code) => ({
        code,
        reviewed: reviewed[code] ?? 0,
        enabled: enabled.has(code),
      })),
    });
  }
);

async function languagesInUse(kind: Kind, id: string): Promise<Set<string>> {
  const type = kind === 'games' ? 'game' : 'station';
  const activities = await Activity.find({
    'module.items': { $elemMatch: { type, ref: id } },
  })
    .select('languages')
    .lean();
  const inUse = new Set<string>();
  for (const activity of activities) {
    for (const lang of activity.languages ?? []) inUse.add(lang);
  }
  return inUse;
}

/**
 * What exists per language, for the tabs: how many sentences a person has
 * corrected, and whether an activity using this item still offers the language.
 * Translations are never deleted when it stops, so `inUse: false` means "kept,
 * but nobody is reading it".
 */
router.get(
  '/:kind/:id/languages',
  authenticateAdmin,
  async (req: Request<{ kind: string; id: string }>, res: Response) => {
    const { kind, id } = req.params;
    if (!isKind(kind)) {
      res.status(404).json({ error: 'Unknown content type' });
      return;
    }

    const doc = await findOneLean(kind, id);
    if (!doc) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const stored = (doc.translations ?? {}) as Record<string, Record<string, string>>;
    const inUse = await languagesInUse(kind, id);

    const codes = new Set<string>([
      ...SUPPORTED_LANGS.filter((code) => code !== 'he'),
      ...Object.keys(stored),
    ]);

    res.json({
      total: [...collectProse(translatableParts(doc))].length,
      languages: [...codes].map((code) => ({
        code,
        reviewed: Object.keys(stored[code] ?? {}).length,
        inUse: inUse.has(code),
        supported: (SUPPORTED_LANGS as readonly string[]).includes(code),
      })),
    });
  }
);

// Nothing is translated by opening this: reading the screen used to translate
// the whole item, most pointlessly for a language no activity offers. Pass
// `?translate=1` to fill in what is missing - what the button on the screen does.
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
  const generate = req.query.translate === '1';
  const machine = generate
    ? await translationsFor(sources, lang)
    : await cachedTranslations(sources, lang);
  const reviewed = (doc.translations?.[lang] ?? {}) as Record<string, string>;

  res.json({
    lang,
    name: doc.name,
    missing: sources.filter((source) => !machine.has(source) && !reviewed[source]).length,
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
