import { Activity, Game, Station, Mission, CustomTheme, LibraryItem, SiteContent, Portal, Layout, Tutorial } from '../models';

export interface MediaUsage {
  collection: string;
  id: string;
  name: string;
}

export function docMentions(doc: unknown, publicId: string): boolean {
  if (!publicId) return false;
  return JSON.stringify(doc ?? null).includes(publicId);
}

const SOURCES: { collection: string; model: { find: Function }; name: (d: Record<string, any>) => string }[] = [
  { collection: 'activities', model: Activity, name: (d) => d.name || d.code },
  { collection: 'games', model: Game, name: (d) => d.name },
  { collection: 'stations', model: Station, name: (d) => d.name },
  { collection: 'missions', model: Mission, name: (d) => d.name },
  { collection: 'themes', model: CustomTheme, name: (d) => d.name },
  { collection: 'library', model: LibraryItem, name: (d) => d.name },
  { collection: 'siteContent', model: SiteContent, name: () => 'Marketing site' },
  { collection: 'portals', model: Portal, name: (d) => d.name || d.code },
  { collection: 'layouts', model: Layout, name: (d) => d.name },
  { collection: 'tutorials', model: Tutorial, name: (d) => d.title },
];

export async function findMediaUsage(publicId: string): Promise<MediaUsage[]> {
  const found = await Promise.all(
    SOURCES.map(async ({ collection, model, name }) => {
      const docs = (await model.find({}).lean()) as Record<string, any>[];
      return docs
        .filter((d) => docMentions(d, publicId))
        .map((d) => ({ collection, id: String(d._id), name: name(d) || String(d._id) }));
    }),
  );
  return found.flat();
}
