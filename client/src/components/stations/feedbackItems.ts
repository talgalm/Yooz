export type FeedbackItem =
  | { type: 'slider'; text: string }
  | { type: 'text'; text: string; placeholder: string };

const str = (value: unknown) => (typeof value === 'string' ? value : '');

export function feedbackItemsFrom(settings: Record<string, unknown>): FeedbackItem[] {
  if (Array.isArray(settings.items) && settings.items.length > 0) {
    return settings.items.flatMap((raw): FeedbackItem[] => {
      if (!raw || typeof raw !== 'object') return [];
      const item = raw as Record<string, unknown>;
      if (item.type === 'slider') return [{ type: 'slider', text: str(item.text) }];
      if (item.type === 'text') return [{ type: 'text', text: str(item.text), placeholder: str(item.placeholder) }];
      return [];
    });
  }
  const sliders: FeedbackItem[] = (Array.isArray(settings.questions) ? settings.questions : [])
    .map((q) => ({ type: 'slider', text: str((q as Record<string, unknown> | null)?.text) }));
  if (settings.notesEnabled === false) return sliders;
  return [...sliders, { type: 'text', text: '', placeholder: str(settings.notesPlaceholder) }];
}

export function feedbackItemsToSave(items: FeedbackItem[]): {
  items: FeedbackItem[];
  questions: { text: string }[];
  notesEnabled: boolean;
  notesPlaceholder?: string;
} {
  const kept = items
    .map((item): FeedbackItem => (item.type === 'slider'
      ? { type: 'slider', text: item.text.trim() }
      : { type: 'text', text: item.text.trim(), placeholder: item.placeholder.trim() }))
    .filter((item) => item.type === 'text' || item.text);
  const firstText = kept.find((item): item is Extract<FeedbackItem, { type: 'text' }> => item.type === 'text');
  return {
    items: kept,
    questions: kept.flatMap((item) => (item.type === 'slider' ? [{ text: item.text }] : [])),
    notesEnabled: !!firstText,
    ...(firstText?.placeholder && { notesPlaceholder: firstText.placeholder }),
  };
}

export function combinedNotes(answers: { prompt: string; text: string }[]): string {
  const given = answers.map((a) => ({ prompt: a.prompt.trim(), text: a.text.trim() })).filter((a) => a.text);
  if (given.length === 1) return given[0].text;
  return given.map((a) => (a.prompt ? `${a.prompt}: ${a.text}` : a.text)).join('\n');
}
