import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { Activity, Game, Station } from '../models';
import { collectProse, translationsFor } from '../services/contentTranslation';
import { normaliseLang, SUPPORTED_LANGS } from '../utils/requestLang';

/**
 * Reviewing what the machine wrote.
 *
 * Content is translated on demand and cached by content hash, which is cheap
 * and needs no upkeep - but it leaves nobody able to fix a clumsy sentence.
 * These two endpoints are that missing half: they list every translatable
 * string in a station or a game next to its machine translation, and store the
 * corrections on the document itself, where a person can see them.
 *
 * A correction is keyed by the exact Hebrew it replaces, so editing the Hebrew
 * retires the correction with the wording it was written for.
 */
const router = Router();

type Kind = 'stations' | 'games';

/** Branching rather than a lookup map: the two models do not share a signature. */
const findOne = (kind: Kind, id: string) => (kind === 'stations' ? Station.findById(id) : Game.findById(id));
const findOneLean = (kind: Kind, id: string) => (kind === 'stations' ? Station.findById(id).lean() : Game.findById(id).lean());

function isKind(raw: string): raw is Kind {
  return raw === 'stations' || raw === 'games';
}

/** Only the parts a participant reads - not timestamps, ids or folder ids. */
function translatableParts(doc: { name?: string; description?: string; settings?: unknown }) {
  return { name: doc.name, description: doc.description, settings: doc.settings };
}

/**
 * What an activity holds in each language, across all of its content.
 *
 * Registered before the `:kind` routes below, which would otherwise swallow
 * `/activity/...` and answer 404. Used by the activity's language picker to
 * show that work already exists for a language - including one that is no
 * longer offered, so turning it back on is visibly free.
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

/** The languages offered by the activities that actually include this item. */
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
 * What exists, per language, before any of it is opened.
 *
 * Drives the language tabs: how many sentences a person has corrected, and
 * whether the language is still offered by an activity that uses this item. A
 * translation is never deleted when an activity stops offering its language -
 * the work was paid for and the language may come back - so `inUse: false` is
 * the honest way to say "kept, but nobody is reading it".
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

    // Every language the app knows, plus any a translation is stored under -
    // including one dropped from the registry, which would otherwise become
    // invisible work.
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

// Every translatable string, with what the machine made of it and what a person
// corrected it to. Missing translations are produced here, on request, so the
// screen is useful before anyone has played the activity.
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

// Store the corrections. An empty or unchanged value drops the correction and
// hands that sentence back to the machine, rather than freezing a copy of it.
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
