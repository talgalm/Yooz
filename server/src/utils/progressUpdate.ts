import type { IModuleConfig } from '../models';

interface ProgressBody {
  lastActiveItemIndex?: unknown;
  totalItemsCompleted?: unknown;
  runningTotal?: unknown;
  itemResult?: { itemIndex?: unknown };
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function progressUpdateFor(body: ProgressBody, moduleType: IModuleConfig['type'] | undefined) {
  const lastActive = isCount(body.lastActiveItemIndex) ? body.lastActiveItemIndex : body.itemResult?.itemIndex;
  const position: Record<string, number> = {
    ...(isCount(lastActive) && { lastActiveItemIndex: lastActive }),
    ...(isCount(body.totalItemsCompleted) && { totalItemsCompleted: body.totalItemsCompleted }),
  };
  const anyOrder = moduleType === 'spiders';
  const hasPosition = Object.keys(position).length > 0;
  return {
    $set: {
      completionStatus: 'in_progress',
      ...(anyOrder && position),
      ...(isCount(body.runningTotal) && { 'data.totalScore': body.runningTotal }),
    },
    ...(!anyOrder && hasPosition && { $max: position }),
  };
}
