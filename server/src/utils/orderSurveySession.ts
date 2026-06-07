import { Activity, Report } from '../models';
import type { IActivity } from '../models/Activity';
import {
  computeBordaRanking,
  countOrderSurveyVotes,
  extractOrderSurveyVotes,
  type BordaRankedItem,
} from './orderSurveyBorda';

export interface OrderSurveyLiveState {
  active: boolean;
  itemIndex: number | null;
  roundIndex: number | null;
  phase: 'voting' | 'results' | null;
  resultsRevealed: boolean;
  voted: number;
  total: number;
  aggregatedRanking: BordaRankedItem[] | null;
}

export async function getOrderSurveyLiveState(activity: IActivity): Promise<OrderSurveyLiveState> {
  const session = activity.orderSurveySession;
  const total = await Report.countDocuments({ activityCode: activity.code });

  if (!session) {
    return {
      active: false,
      itemIndex: null,
      roundIndex: null,
      phase: null,
      resultsRevealed: false,
      voted: 0,
      total,
      aggregatedRanking: null,
    };
  }

  const reports = await Report.find(
    { activityCode: activity.code },
    { data: 1 },
  ).lean();

  const voted = countOrderSurveyVotes(reports, session.itemIndex);

  return {
    active: true,
    itemIndex: session.itemIndex,
    roundIndex: session.roundIndex,
    phase: session.phase,
    resultsRevealed: session.resultsRevealed,
    voted,
    total,
    aggregatedRanking: session.aggregatedRanking ?? null,
  };
}

export async function closeOrderSurveyVoting(activityCode: string): Promise<BordaRankedItem[] | null> {
  const activity = await Activity.findOne({ code: activityCode });
  if (!activity?.orderSurveySession) return null;

  const reports = await Report.find({ activityCode }, { data: 1 }).lean();
  const { rankings, items } = extractOrderSurveyVotes(reports, activity.orderSurveySession.itemIndex);
  if (!items || items.length === 0 || rankings.length === 0) {
    activity.orderSurveySession.phase = 'results';
    activity.orderSurveySession.resultsRevealed = false;
    activity.orderSurveySession.aggregatedRanking = [];
    activity.orderSurveySession.updatedAt = new Date();
    activity.markModified('orderSurveySession');
    await activity.save();
    return [];
  }

  const aggregatedRanking = computeBordaRanking(rankings, items);
  activity.orderSurveySession.phase = 'results';
  activity.orderSurveySession.resultsRevealed = false;
  activity.orderSurveySession.aggregatedRanking = aggregatedRanking;
  activity.orderSurveySession.updatedAt = new Date();
  activity.markModified('orderSurveySession');
  await activity.save();
  return aggregatedRanking;
}
