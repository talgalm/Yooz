import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { Activity, MapGroupState, type IMapGroupState } from '../models';
import { israelDayString } from '../utils/israelTime';

const router = Router();

const CARRIER_STALE_MS = 120_000;
const POSITION_FRESH_MS = 300_000;

interface GroupKey {
  activityId: Types.ObjectId;
  activityDay: string;
  groupName: string;
}

async function loadGroupPosition(req: Request, res: Response): Promise<{ marker: IMapGroupState; key: GroupKey } | null> {
  const participant = req.participant!;
  const groupName = participant.group;
  if (!groupName) {
    res.status(400).json({ error: 'map_requires_group' });
    return null;
  }
  const activity = await Activity.findOne({ code: req.params.code }).select('code module.type').lean();
  if (!activity || !activity.module || activity.module.type !== 'map') {
    res.status(404).json({ error: 'Not a map activity' });
    return null;
  }
  if (participant.activityCode !== activity.code) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  const key: GroupKey = { activityId: activity._id as Types.ObjectId, activityDay: israelDayString(), groupName };
  const marker = await MapGroupState.findOneAndUpdate(
    key,
    { $setOnInsert: { activityCode: activity.code, startedAt: new Date() } },
    { new: true, upsert: true },
  ).lean();
  return { marker: marker as IMapGroupState, key };
}

router.post('/:code/map/position', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const lat = Number((req.body ?? {}).lat);
  const lng = Number((req.body ?? {}).lng);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    res.status(400).json({ error: 'bad_position' });
    return;
  }

  const loaded = await loadGroupPosition(req, res);
  if (!loaded) return;
  const { marker, key } = loaded;
  const reportId = req.participant!.reportId;

  const carrier = marker.positionCarrierReportId ? String(marker.positionCarrierReportId) : null;
  const stale = !marker.positionAt || Date.now() - new Date(marker.positionAt).getTime() > CARRIER_STALE_MS;
  const mayBroadcast = !carrier || carrier === reportId || stale;

  if (mayBroadcast) {
    await MapGroupState.updateOne(
      { ...key, ...(carrier ? { positionCarrierReportId: marker.positionCarrierReportId } : { positionCarrierReportId: { $exists: false } }) },
      { $set: { position: { lat, lng }, positionAt: new Date(), positionCarrierReportId: reportId } },
    );
  }

  res.json({ broadcasting: mayBroadcast });
});

router.get('/:code/map/state', authenticateToken, async (req: Request<{ code: string }>, res: Response) => {
  const loaded = await loadGroupPosition(req, res);
  if (!loaded) return;
  const { key } = loaded;

  const others = await MapGroupState.find({
    activityId: key.activityId,
    activityDay: key.activityDay,
    groupName: { $ne: key.groupName },
    positionAt: { $gte: new Date(Date.now() - POSITION_FRESH_MS) },
  }).lean();

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    groups: others
      .filter((g) => g.position)
      .map((g) => ({ groupName: g.groupName, position: g.position, positionAt: g.positionAt })),
  });
});

export default router;
