import type { IModuleConfig } from '../models';
import { visibleOrderedIndices } from './moduleItems';

export function stationIndexFor(
  module: Pick<IModuleConfig, 'items' | 'groupOrders'>,
  participantGroup: string | undefined,
  position: number,
  itemId: unknown,
): number | undefined {
  const served = visibleOrderedIndices(module, participantGroup);
  const refOf = (i: number) => String(module.items?.[i]?.ref ?? '');
  const at = served[position];
  if (at !== undefined && (!itemId || refOf(at) === String(itemId))) return at;
  const sameStation = served.filter((i) => refOf(i) === String(itemId));
  return sameStation.length === 1 ? sameStation[0] : at;
}

export function resultStationIndex(result: { itemIndex: number; stationIndex?: number }): number {
  return typeof result.stationIndex === 'number' ? result.stationIndex : result.itemIndex;
}

export function reportByStation<R extends { data?: unknown }>(report: R): R {
  const data = report.data as { itemResults?: { itemIndex: number; stationIndex?: number }[] } | undefined;
  if (!data?.itemResults?.length) return report;
  return {
    ...report,
    data: { ...data, itemResults: data.itemResults.map((result) => ({ ...result, itemIndex: resultStationIndex(result) })) },
  };
}

export const STATION_KEY = { $ifNull: ['$data.itemResults.stationIndex', '$data.itemResults.itemIndex'] };
