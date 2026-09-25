import { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../../utils/adminApi';
import { LANGS } from '../../../context/LanguageContext';
import { texts } from './TranslationsModal.i18n';
import { useTranslations } from '../../../context/LanguageContext';

interface Row {
  source: string;
  machine: string | null;
  reviewed: string | null;
}

interface TranslationsModalProps {
  kind: 'stations' | 'games';
  id: string;
  title: string;
  onClose: () => void;
}

const Backdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(28,22,48,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  padding: 20,
});

const Panel = styled('div')({
  background: '#fff',
  borderRadius: 16,
  width: 'min(760px, 100%)',
  maxHeight: '86dvh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 18px 48px rgba(40,30,70,0.28)',
});

const Head = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '18px 22px',
  borderBottom: '1px solid #ece8f3',
});

const Title = styled('div')({ fontSize: 17, fontWeight: 800, color: '#2d2540' });

const Hint = styled('p')({
  margin: '10px 22px 0',
  fontSize: 13,
  lineHeight: 1.6,
  color: '#6b6280',
});

const Body = styled('div')({ padding: '12px 22px 18px', overflowY: 'auto' });

const RowBox = styled('div')({
  padding: '14px 0',
  borderBottom: '1px solid #f1eef8',
  display: 'grid',
  gap: 8,
});

const Source = styled('div')({ fontSize: 14, fontWeight: 700, color: '#2d2540' });

const Machine = styled('div')({ fontSize: 13, color: '#8d84a6' });

const Input = styled('input')({
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #ded7f0',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  '&:focus': { borderColor: '#6C5CE7' },
});

const Foot = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 22px',
  borderTop: '1px solid #ece8f3',
});

const Button = styled('button')<{ primary?: boolean }>(({ primary }) => ({
  padding: '10px 20px',
  borderRadius: 10,
  border: primary ? 'none' : '1.5px solid #ded7f0',
  background: primary ? '#6C5CE7' : '#fff',
  color: primary ? '#fff' : '#2d2540',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:disabled': { opacity: 0.55, cursor: 'default' },
}));

const LangTab = styled('button')<{ active?: boolean }>(({ active }) => ({
  padding: '7px 14px',
  borderRadius: 999,
  border: `1.5px solid ${active ? '#6C5CE7' : '#ded7f0'}`,
  background: active ? '#f4f1ff' : '#fff',
  color: active ? '#6C5CE7' : '#6b6280',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
}));

const Note = styled('div')({ fontSize: 13, color: '#6b6280' });

export default function TranslationsModal({ kind, id, title, onClose }: TranslationsModalProps) {
  const t = useTranslations(texts);
  const options = LANGS.filter((l) => l.code !== 'he');
  const [lang, setLang] = useState(options[0]?.code ?? 'en');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setFailed(false);
    adminApiFetch<{ rows: Row[] }>(`/api/admin/translations/${kind}/${id}?lang=${lang}`)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setEdits(Object.fromEntries(data.rows.map((r) => [r.source, r.reviewed ?? ''])));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [kind, id, lang]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApiFetch(`/api/admin/translations/${kind}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ lang, reviewed: edits }),
      });
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Backdrop onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>{t.title.replace('{name}', title)}</Title>
          <div style={{ display: 'flex', gap: 8 }}>
            {options.map((l) => (
              <LangTab key={l.code} type="button" active={l.code === lang} onClick={() => setLang(l.code)}>
                {l.label}
              </LangTab>
            ))}
          </div>
        </Head>

        <Hint>{t.hint}</Hint>

        <Body>
          {failed && <Note>{t.failed}</Note>}
          {!failed && rows === null && <Note>{t.loading}</Note>}
          {rows?.length === 0 && <Note>{t.empty}</Note>}
          {rows?.map((row) => (
            <RowBox key={row.source}>
              <Source>{row.source}</Source>
              <Machine>{row.machine ?? t.noMachine}</Machine>
              <Input
                value={edits[row.source] ?? ''}
                placeholder={row.machine ?? ''}
                onChange={(e) => setEdits((prev) => ({ ...prev, [row.source]: e.target.value }))}
              />
            </RowBox>
          ))}
        </Body>

        <Foot>
          <Note>{t.footNote}</Note>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="button" onClick={onClose}>{t.cancel}</Button>
            <Button type="button" primary disabled={saving || rows === null} onClick={save}>
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </Foot>
      </Panel>
    </Backdrop>
  );
}
