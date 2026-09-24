import { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../utils/adminApi';
import { LANGS, useTranslations } from '../../context/LanguageContext';
import { texts } from './TranslationsPanel.i18n';

interface Row {
  source: string;
  machine: string | null;
  reviewed: string | null;
}

export interface LangSummary {
  code: string;
  /** How many sentences a person has corrected by hand. */
  reviewed: number;
  /** Whether an activity that uses this item still offers the language. */
  inUse: boolean;
  supported: boolean;
}

interface TranslationsPanelProps {
  /** Which collection the item lives in. */
  kind: 'stations' | 'games';
  id: string;
  lang: string;
  inUse: boolean;
  /** Lets the tab strip refresh its counts after a save. */
  onSaved?: () => void;
}

/** The admin surfaces this appears on are light, so there is one palette. */
const INK = '#2d2540';
const MUTED = '#6b6280';
const LINE = '#ded7f0';
const ACCENT = '#6C5CE7';

const Wrap = styled('div')({ display: 'grid', gap: 16 });

const Hint = styled('p')({ margin: 0, fontSize: 13, lineHeight: 1.6, color: MUTED });

const UnusedNote = styled('div')({
  display: 'grid',
  gap: 4,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #f0dcb8',
  background: '#fff8ec',
  fontSize: 12.5,
  lineHeight: 1.6,
  color: '#7a5a1c',
});

const UnusedTitle = styled('div')({ fontWeight: 800 });

const TranslateRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 6,
});

const TranslateButton = styled('button')({
  padding: '8px 16px',
  borderRadius: 9,
  border: '1.5px solid #e0a84a',
  background: '#fff',
  color: '#8a5f14',
  fontSize: 13,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:disabled': { opacity: 0.6, cursor: 'default' },
});

const Fields = styled('div')({ display: 'grid', gap: 16 });

/** One translated string, laid out like a labelled field in the form itself. */
const Field = styled('div')({ display: 'grid', gap: 6 });

const SourceLabel = styled('label')({
  fontSize: 13,
  fontWeight: 700,
  color: INK,
  lineHeight: 1.5,
});

const Box = styled('input')<{ edited?: boolean }>(({ edited }) => ({
  width: '100%',
  padding: '11px 13px',
  border: `1.5px solid ${edited ? ACCENT : LINE}`,
  borderRadius: 10,
  background: '#fff',
  color: INK,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  // The box reads in its own language's direction, not the panel's. Without
  // this, English inside a Hebrew screen shows its full stops and question
  // marks at the wrong end of the line.
  textAlign: 'start',
  '&:focus': { borderColor: ACCENT },
}));

const EditedMark = styled('span')({
  fontSize: 11,
  fontWeight: 800,
  color: ACCENT,
  marginInlineStart: 8,
});

const Foot = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  borderTop: `1px solid ${LINE}`,
  paddingTop: 14,
});

const Note = styled('div')({ fontSize: 12.5, color: MUTED });

const Actions = styled('div')({ display: 'flex', gap: 10, alignItems: 'center' });

const SaveButton = styled('button')({
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  background: ACCENT,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:disabled': { opacity: 0.5, cursor: 'default' },
});

const ResetButton = styled('button')({
  padding: '10px 16px',
  borderRadius: 10,
  border: `1.5px solid ${LINE}`,
  background: '#fff',
  color: MUTED,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
});

/**
 * This item's content in one language, editable in place.
 *
 * Each box opens holding what will actually be shown - a person's own wording
 * if there is one, otherwise the machine's - so the screen reads like the
 * station's form rather than like a review queue.
 *
 * Only boxes whose text differs from the machine's are stored. A box left as
 * the machine wrote it stays the machine's, so a better translation later
 * flows through instead of being frozen as a correction; clearing a box hands
 * that sentence back the same way. Rows are keyed by the Hebrew they replace,
 * so editing the Hebrew retires the correction written for it.
 */
export default function TranslationsPanel({ kind, id, lang, inUse, onSaved }: TranslationsPanelProps) {
  const t = useTranslations(texts);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [missing, setMissing] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [failed, setFailed] = useState<'load' | 'save' | 'translate' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setFailed(null);
    setSavedAt(0);
    // No `translate=1`: opening a tab reads what exists and translates nothing.
    adminApiFetch<{ rows: Row[]; missing: number }>(
      `/api/admin/translations/${kind}/${id}?lang=${lang}`
    )
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setMissing(data.missing);
        // The box opens on what participants would see right now.
        setEdits(
          Object.fromEntries(data.rows.map((r) => [r.source, r.reviewed ?? r.machine ?? '']))
        );
      })
      .catch(() => !cancelled && setFailed('load'));
    return () => {
      cancelled = true;
    };
  }, [kind, id, lang]);

  /** Asks for the sentences that have none. The only thing that spends a model call. */
  const translateMissing = async () => {
    setTranslating(true);
    setFailed(null);
    try {
      const data = await adminApiFetch<{ rows: Row[]; missing: number }>(
        `/api/admin/translations/${kind}/${id}?lang=${lang}&translate=1`
      );
      setRows(data.rows);
      setMissing(data.missing);
      // Anything already in a box is the person's own work; only fill the blanks.
      setEdits((prev) =>
        Object.fromEntries(
          data.rows.map((r) => [r.source, prev[r.source]?.trim() || r.reviewed || r.machine || ''])
        )
      );
    } catch {
      setFailed('translate');
    } finally {
      setTranslating(false);
    }
  };

  /** The direction this language reads in, from the one language registry. */
  const dir = LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';

  const isEdited = (row: Row) => {
    const value = (edits[row.source] ?? '').trim();
    return value.length > 0 && value !== (row.machine ?? '').trim();
  };

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    setFailed(null);
    try {
      const reviewed: Record<string, string> = {};
      for (const row of rows) {
        if (isEdited(row)) reviewed[row.source] = edits[row.source].trim();
      }
      await adminApiFetch(`/api/admin/translations/${kind}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ lang, reviewed }),
      });
      setSavedAt(Date.now());
      onSaved?.();
    } catch {
      setFailed('save');
    } finally {
      setSaving(false);
    }
  };

  /** Puts every box back to the machine's wording, before saving. */
  const resetAll = () => {
    if (!rows) return;
    setEdits(Object.fromEntries(rows.map((r) => [r.source, r.machine ?? ''])));
  };

  const editedCount = rows?.filter(isEdited).length ?? 0;

  return (
    <Wrap>
      <Hint>{t.hint}</Hint>

      {/*
        Nothing was translated, and for a language no activity offers, nothing
        would have been - so say that plainly and let it be asked for, rather
        than quietly spending a model call on a screen nobody reads.
      */}
      {rows !== null && missing > 0 && (
        <UnusedNote>
          <UnusedTitle>
            {missing === rows.length ? t.notTranslatedTitle : t.partlyTranslatedTitle}
          </UnusedTitle>
          <div>{inUse ? t.missingBody : t.notTranslatedBody}</div>
          <TranslateRow>
            <TranslateButton type="button" onClick={translateMissing} disabled={translating}>
              {translating ? t.translating : t.translateNow.replace('{n}', String(missing))}
            </TranslateButton>
            {failed === 'translate' && <Note>{t.translateFailed}</Note>}
          </TranslateRow>
        </UnusedNote>
      )}

      {!inUse && missing === 0 && (
        <UnusedNote>
          <UnusedTitle>{t.unusedTitle}</UnusedTitle>
          <div>{t.unusedBody}</div>
        </UnusedNote>
      )}

      {failed === 'load' && <Note>{t.failed}</Note>}
      {!failed && rows === null && <Note>{t.loading}</Note>}
      {rows?.length === 0 && <Note>{t.empty}</Note>}

      {rows && rows.length > 0 && (
        <>
          <Fields>
            {rows.map((row) => (
              <Field key={row.source}>
                <SourceLabel htmlFor={`tr-${row.source}`}>
                  {row.source}
                  {isEdited(row) && <EditedMark>{t.editedMark}</EditedMark>}
                </SourceLabel>
                <Box
                  id={`tr-${row.source}`}
                  dir={dir}
                  lang={lang}
                  edited={isEdited(row)}
                  value={edits[row.source] ?? ''}
                  placeholder={row.machine ?? t.noMachine}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [row.source]: e.target.value }))}
                />
              </Field>
            ))}
          </Fields>

          <Foot>
            <Note>
              {failed === 'save'
                ? t.saveFailed
                : savedAt
                  ? t.saved
                  : t.editedCount.replace('{n}', String(editedCount))}
            </Note>
            <Actions>
              {editedCount > 0 && (
                <ResetButton type="button" onClick={resetAll}>
                  {t.resetAll}
                </ResetButton>
              )}
              <SaveButton type="button" onClick={save} disabled={saving}>
                {saving ? t.saving : t.save}
              </SaveButton>
            </Actions>
          </Foot>
        </>
      )}
    </Wrap>
  );
}
