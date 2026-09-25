import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { Activity, MapGroupState, type IMapGroupState } from '../models';
import { israelDayString } from '../utils/israelTime';
import { visibleOrderedIndices, nextIncompleteIndex } from '../utils/moduleItems';

const router = Router();

const CARRIER_STALE_MS = 120_000;
const POSITION_FRESH_MS = 300_000;

interface GroupKey {
  activityId: Types.ObjectId;
  activityDay: string;
  groupName: string;
}

async function loadRun(req: Request, res: Response): Promise<
  { activity: NonNullable<Awaited<ReturnType<typeof Activity.findOne>>>; run: IMapGroupState; key: GroupKey; total: number } | null
> {
  const participant = req.participant!;
  const groupName = participant.group;
  if (!groupName) {
    res.status(400).json({ error: 'map_requires_group' });
    return null;
  }
  const activity = await Activity.findOne({ code: req.params.code });
  if (!activity || !activity.module || activity.module.type !== 'map') {
    res.status(404).json({ error: 'Not a map activity' });
    return null;
  }
  if (participant.activityCode !== activity.code) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  const key: GroupKey = { activityId: activity._id as Types.ObjectId, activityDay: israelDayString(), groupName };
  const run = await MapGroupState.findOneAndUpdate(
    key,
    { $setOnInsert: { activityCode: activity.code, startedAt: new Date() } },
    { new: true, upsert: true },
  ).lean();

  const total = visibleOrderedIndices(activity.module, groupName).length;
  return { activity, run: run as IMapGroupState, key, total };
}

function serializeRun(run: IMapGroupState, total: number) {
  const completed = run.completedIndices || [];
  return {
    groupName: run.groupName,
    completedIndices: completed,
    currentItemIndex: nextIncompleteIndex(completed, total),
    score: run.score || 0,
    totalItems: total,
    finished: completed.length >= total && total > 0,
  };
}

router.post('/:code/map/position', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const lat = Number((req.body ?? {}).lat);
  const lng = Number((req.body ?? {}).lng);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    res.status(400).json({ error: 'bad_position' });
    return;
  }

  const loaded = await loadRun(req, res);
  if (!loaded) return;
  const { run, key, total } = loaded;
  const reportId = req.participant!.reportId;

  const carrier = run.positionCarrierReportId ? String(run.positionCarrierReportId) : null;
  const stale = !run.positionAt || Date.now() - new Date(run.positionAt).getTime() > CARRIER_STALE_MS;
  const mayBroadcast = !carrier || carrier === reportId || stale;

  if (mayBroadcast) {
    await MapGroupState.updateOne(
      { ...key, ...(carrier ? { positionCarrierReportId: run.positionCarrierReportId } : { positionCarrierReportId: { $exists: false } }) },
      { $set: { position: { lat, lng }, positionAt: new Date(), positionCarrierReportId: reportId } },
    );
  }

  res.json({ broadcasting: mayBroadcast, ...serializeRun(run, total) });
});

router.get('/:code/map/state', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const loaded = await loadRun(req, res);
  if (!loaded) return;
  const { activity, run, key, total } = loaded;

  const others = await MapGroupState.find({
    activityId: key.activityId,
    activityDay: key.activityDay,
    groupName: { $ne: key.groupName },
  }).lean();

  const cutoff = Date.now() - POSITION_FRESH_MS;
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    me: serializeRun(run, total),
    groups: others.map((g) => {
      const otherTotal = visibleOrderedIndices(activity.module!, g.groupName).length;
      const fresh = g.positionAt && new Date(g.positionAt).getTime() >= cutoff;
      return {
        groupName: g.groupName,
        score: g.score || 0,
        completedCount: (g.completedIndices || []).length,
        totalItems: otherTotal,
        ...(fresh && g.position ? { position: g.position, positionAt: g.positionAt } : {}),
      };
    }),
  });
});

router.post('/:code/map/complete', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const itemIndex = Number((req.body ?? {}).itemIndex);
  const score = Number((req.body ?? {}).score) || 0;

  const loaded = await loadRun(req, res);
  if (!loaded) return;
  const { run, key, total } = loaded;

  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= total) {
    res.status(400).json({ error: 'bad_item_index' });
    return;
  }

  const advanced = await MapGroupState.findOneAndUpdate(
    { ...key, completedIndices: { $ne: itemIndex } },
    { $addToSet: { completedIndices: itemIndex }, $inc: { score: Math.max(0, score) } },
    { new: true },
  ).lean();

  const current = (advanced as IMapGroupState | null) ?? run;
  const result = serializeRun(current, total);
  if (result.finished && !current.completedAt) {
    await MapGroupState.updateOne({ ...key, completedAt: { $exists: false } }, { $set: { completedAt: new Date() } });
  }
  res.json(result);
});

export default router;
