import { Router, Request, Response } from 'express';
import { authenticateManage, requireManageRole } from '../middleware/manageAuth';
import { Settings } from '../models/manage/Settings';
import { getSettings, invalidateSettingsCache } from '../services/manageSettings';
import { TIME_CATEGORIES } from '../models/manage/TimeEntry';
import { DEFAULT_STAGE_TEMPLATE } from '../services/manageMetrics';

const router = Router();
router.use(authenticateManage);
router.use(requireManageRole('owner'));

router.get('/', async (_req: Request, res: Response) => {
  res.json({ settings: await getSettings() });
});

router.patch('/', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (Array.isArray(body.stageTemplate)) {
    const raw = body.stageTemplate as { key?: unknown; name?: unknown; percent?: unknown }[];
    const template = raw
      .filter((s) => typeof s?.key === 'string' && typeof s?.name === 'string')
      .map((s) => ({
        key: String(s.key).trim(),
        name: String(s.name).trim(),
        percent: Number(s.percent) || 0,
      }));

    if (template.length === 0) { res.status(400).json({ error: 'template_empty' }); return; }
    if (template.some((s) => !s.key || !s.name)) { res.status(400).json({ error: 'stage_needs_key_and_name' }); return; }
    if (new Set(template.map((s) => s.key)).size !== template.length) {
      res.status(400).json({ error: 'duplicate_stage_key' });
      return;
    }
    if (template.some((s) => s.percent < 0)) { res.status(400).json({ error: 'negative_percent' }); return; }

    const total = Math.round(template.reduce((a, s) => a + s.percent, 0) * 100) / 100;
    if (total !== 100) {
      res.status(400).json({ error: 'percentages_must_total_100', detail: { total } });
      return;
    }
    update.stageTemplate = template;
  }

  if (Array.isArray(body.timeCategories)) {
    const raw = body.timeCategories as { key?: unknown; label?: unknown; requiresProject?: unknown }[];
    const categories = TIME_CATEGORIES.map((key) => {
      const found = raw.find((c) => c?.key === key);
      return {
        key,
        label: typeof found?.label === 'string' && found.label.trim() ? found.label.trim() : key,
        requiresProject: !!found?.requiresProject,
      };
    });
    update.timeCategories = categories;
  }

  if (typeof body.thresholds === 'object' && body.thresholds !== null) {
    const t = body.thresholds as Record<string, unknown>;
    const current = (await getSettings()).thresholds;
    const next = {
      nearBudget: Number(t.nearBudget ?? current.nearBudget),
      overBudget: Number(t.overBudget ?? current.overBudget),
      lowProgress: Number(t.lowProgress ?? current.lowProgress),
      staleClientDays: Math.round(Number(t.staleClientDays ?? current.staleClientDays)),
      contractEndingDays: Math.round(Number(t.contractEndingDays ?? current.contractEndingDays)),
    };
    if (Object.values(next).some((v) => !Number.isFinite(v) || v < 0)) {
      res.status(400).json({ error: 'thresholds_must_be_positive' });
      return;
    }
    if (next.nearBudget > next.overBudget) {
      res.status(400).json({ error: 'near_budget_above_over_budget' });
      return;
    }
    update.thresholds = next;
  }

  if (typeof body.defaults === 'object' && body.defaults !== null) {
    const d = body.defaults as Record<string, unknown>;
    const current = (await getSettings()).defaults;
    const next = {
      weeklyCapacityHours: Number(d.weeklyCapacityHours ?? current.weeklyCapacityHours),
      employerCostFactor: Number(d.employerCostFactor ?? current.employerCostFactor),
      maxHoursPerDay: Number(d.maxHoursPerDay ?? current.maxHoursPerDay),
    };
    if (Object.values(next).some((v) => !Number.isFinite(v) || v < 0)) {
      res.status(400).json({ error: 'defaults_must_be_positive' });
      return;
    }
    if (next.maxHoursPerDay < 1 || next.maxHoursPerDay > 24) {
      res.status(400).json({ error: 'max_hours_out_of_range' });
      return;
    }
    if (next.weeklyCapacityHours > 168) {
      res.status(400).json({ error: 'capacity_out_of_range' });
      return;
    }
    update.defaults = next;
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'nothing_to_update' });
    return;
  }

  const settings = await Settings.findOneAndUpdate(
    { singleton: 'settings' },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  invalidateSettingsCache();

  res.json({ settings });
});

router.post('/stage-template/reset', async (_req: Request, res: Response) => {
  const settings = await Settings.findOneAndUpdate(
    { singleton: 'settings' },
    { $set: { stageTemplate: DEFAULT_STAGE_TEMPLATE } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  invalidateSettingsCache();
  res.json({ settings });
});

export default router;
