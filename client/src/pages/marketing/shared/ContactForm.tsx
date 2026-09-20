import { useState, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { apiFetch } from '../../../utils/api';
import { texts } from './ContactForm.i18n';
import { C, SHADOW, RADIUS, BP } from './tokens';
import { Container } from './styled';

/**
 * The comps tint this card differently per page: cream on Home, peach on
 * Academy, and a solid violet card - with the fields inside their own white
 * panel - on Business and Tourism.
 */
export type ContactTone = 'cream' | 'peach' | 'purple';

interface ContactFormProps {
  tone?: ContactTone;
}

const TONES: Record<ContactTone, {
  bg: string;
  title: string;
  accent: string;
  blurb: string;
  panel: boolean;
  submitBg: string;
  submitFg: string;
}> = {
  cream: { bg: '#F8F0E0', title: C.heading, accent: C.magenta, blurb: C.inkSoft, panel: false, submitBg: C.purple, submitFg: C.white },
  peach: { bg: '#FCE8D5', title: C.heading, accent: C.magenta, blurb: C.inkSoft, panel: false, submitBg: C.purple, submitFg: C.white },
  purple: { bg: C.purple, title: C.white, accent: C.amber, blurb: 'rgba(255,255,255,0.85)', panel: true, submitBg: '#F5E6FA', submitFg: C.heading },
};

const Wrap = styled('div')({ position: 'relative', paddingBlock: 40, [BP.mobile]: { paddingBlock: 26 } });

const CardBox = styled('div')<{ bg: string }>(({ bg }) => ({
  background: bg,
  borderRadius: 30,
  padding: '46px 44px 50px',
  boxShadow: SHADOW.float,
  width: 'min(696px, 100%)',
  marginInline: 'auto',
  boxSizing: 'border-box',
  [BP.mobile]: { padding: '32px 20px 36px', borderRadius: 22 },
}));

const TitleTop = styled('div')<{ color: string }>(({ color }) => ({
  fontSize: 'clamp(23px, 3vw, 33px)',
  fontWeight: 900,
  lineHeight: 1.2,
  textAlign: 'center',
  color,
}));

const TitleBottom = styled('div')<{ color: string }>(({ color }) => ({
  fontSize: 'clamp(23px, 3vw, 33px)',
  fontWeight: 900,
  lineHeight: 1.2,
  textAlign: 'center',
  color,
  marginBottom: 12,
}));

const Blurb = styled('p')<{ color: string }>(({ color }) => ({
  fontSize: 13.5,
  lineHeight: 1.7,
  textAlign: 'center',
  color,
  margin: '0 0 26px',
}));

/** On the violet card the fields live inside their own white panel. */
const Panel = styled('div')<{ on: boolean }>(({ on }) => ({
  background: on ? C.white : 'transparent',
  borderRadius: on ? 18 : 0,
  padding: on ? '30px 28px' : 0,
  [BP.mobile]: { padding: on ? '20px 16px' : 0 },
}));

const Fields = styled('form')({ display: 'grid', gap: 16 });

/** Same stack, but a plain element - nesting a <form> inside a <form> is invalid. */
const FieldStack = styled('div')({ display: 'grid', gap: 16 });

const Field = styled('input')({
  width: '100%',
  background: C.white,
  border: `1.8px solid ${C.purple}`,
  borderRadius: RADIUS.field,
  padding: '15px 20px',
  /** 16 is the floor: iOS Safari zooms the page when a focused field is smaller. */
  fontSize: 16,
  fontFamily: 'inherit',
  color: C.ink,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  '&::placeholder': { color: '#A99BB5' },
  '&:focus': { borderColor: C.magenta, boxShadow: '0 0 0 4px rgba(233,71,154,0.14)' },
});

/** Same treatment as `Field`, sized for a few lines and not resizable sideways. */
const TextArea = styled('textarea')({
  width: '100%',
  minHeight: 96,
  resize: 'vertical',
  background: C.white,
  border: `1.8px solid ${C.purple}`,
  borderRadius: RADIUS.field,
  padding: '15px 20px',
  /** Same 16px floor as `Field`, for the same iOS zoom reason. */
  fontSize: 16,
  fontFamily: 'inherit',
  lineHeight: 1.6,
  color: C.ink,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  '&::placeholder': { color: '#A99BB5' },
  '&:focus': { borderColor: C.magenta, boxShadow: '0 0 0 4px rgba(233,71,154,0.14)' },
});

const SubmitRow = styled('div')({ display: 'flex', justifyContent: 'center', marginTop: 4 });

const Submit = styled('button')<{ bg: string; fg: string }>(({ bg, fg }) => ({
  background: bg,
  color: fg,
  border: 'none',
  borderRadius: RADIUS.button,
  padding: '14px 52px',
  fontSize: 16,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  boxShadow: SHADOW.card,
  transition: 'transform 0.15s ease, filter 0.15s ease',
  '&:hover:not(:disabled)': { transform: 'translateY(-2px)', filter: 'brightness(1.04)' },
  '&:disabled': { opacity: 0.65, cursor: 'default' },
}));

const Note = styled('div')<{ error?: boolean; onDark: boolean }>(({ error, onDark }) => ({
  textAlign: 'center',
  fontSize: 13.5,
  fontWeight: 700,
  marginTop: 10,
  color: error ? (onDark ? '#FFD2D2' : '#C0392B') : onDark ? '#B9F5D0' : '#1E8A53',
}));

const EMPTY = { name: '', email: '', phone: '', company: '', message: '' };

export default function ContactForm({ tone = 'cream' }: ContactFormProps) {
  const t = useTranslations(texts);
  const p = TONES[tone];
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error' | 'required'>('idle');

  const set =
    (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // Mirrors `validateLead` on the server, so the user sees the problem before
    // a round trip rather than after a 400.
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setStatus('required');
      return;
    }
    setStatus('sending');
    try {
      await apiFetch('/api/site-content/leads', { method: 'POST', body: JSON.stringify(form) });
      setStatus('ok');
      setForm(EMPTY);
    } catch {
      setStatus('error');
    }
  };

  return (
    <Wrap id="contact">
      <Container>
        <CardBox bg={p.bg}>
          <TitleTop color={p.title}>{t.titleTop}</TitleTop>
          <TitleBottom color={p.accent}>{t.titleBottom}</TitleBottom>
          <Blurb color={p.blurb}>{t.blurb}</Blurb>

          <Fields onSubmit={submit} noValidate>
            <Panel on={p.panel}>
              <FieldStack>
                <Field placeholder={t.name} value={form.name} onChange={set('name')} autoComplete="name" />
                <Field placeholder={t.email} type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                <Field placeholder={t.phone} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                <Field placeholder={t.company} value={form.company} onChange={set('company')} autoComplete="organization" />
                <TextArea placeholder={t.message} rows={3} value={form.message} onChange={set('message')} />
              </FieldStack>
            </Panel>

            <SubmitRow>
              <Submit type="submit" bg={p.submitBg} fg={p.submitFg} disabled={status === 'sending'}>
                {status === 'sending' ? t.sending : t.send}
              </Submit>
            </SubmitRow>

            {status === 'ok' && <Note onDark={p.panel}>{t.success}</Note>}
            {status === 'error' && <Note error onDark={p.panel}>{t.error}</Note>}
            {status === 'required' && <Note error onDark={p.panel}>{t.required}</Note>}
          </Fields>
        </CardBox>
      </Container>
    </Wrap>
  );
}
