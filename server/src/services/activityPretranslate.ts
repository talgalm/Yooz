import { Activity, Station, Game, Mission } from '../models';
import { collectProse, translationsFor } from './contentTranslation';

/**
 * Warms the translation cache for an activity.
 *
 * Without this the first participant to pick English pays for the whole
 * activity: dozens of strings, batched, against a model - seconds of waiting on
 * the screen where a game should have started. Saving the activity in the admin
 * does that work instead, while nobody is playing.
 *
 * Fire-and-forget by design: it runs after the save has already been answered,
 * and a failure costs nothing but a slower first run, since the participant
 * path translates whatever it finds missing anyway.
 */
export async function pretranslateActivity(activityId: string, langs: string[]): Promise<number> {
  const targets = langs.filter((l) => l && l !== 'he');
  if (targets.length === 0) return 0;

  const activity = await Activity.findById(activityId).lean();
  if (!activity?.module) return 0;

  const items = activity.module.items || [];
  const idsOf = (type: string) => items.filter((i) => i.type === type).map((i) => i.ref);

  const [stations, games, missions] = await Promise.all([
    Station.find({ _id: { $in: idsOf('station') } }).lean(),
    Game.find({ _id: { $in: idsOf('game') } }).lean(),
    Mission.find({ _id: { $in: idsOf('mission') } }).lean(),
  ]);

  /**
   * The same shape the participant is served: the module's own copy (popups,
   * item labels) plus every station, game and mission it points at.
   */
  const content = {
    name: activity.name,
    guidelines: activity.guidelines,
    module: activity.module,
    stations,
    games,
    missions,
  };

  const sources = [...collectProse(content)];
  if (sources.length === 0) return 0;

  let translated = 0;
  for (const lang of targets) {
    const map = await translationsFor(sources, lang);
    translated += map.size;
  }
  return translated;
}
