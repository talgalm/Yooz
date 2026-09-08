import { useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from '../money.i18n';
import { formatMoney } from '../manageTypes';
import { BORDER, TEXT_LIGHT } from '../../../components/styled';
import { Panel, EmptyState, SmallInput, ErrorNote, Pill, MOBILE } from '../manageUi';

interface Rate {
  _id: string;
  name: string;
  role: string;
  tracksTime: boolean;
  hourlyCost: number;
  employerCostFactor: number;
  effectiveHourlyCost: number;
}

const Head = styled('div')({
  padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
});
const Title = styled('b')({ fontSize: 15 });
const Row = styled('div')({
  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  padding: '11px 16px', fontSize: 14, borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});
const Name = styled('b')({ minWidth: 110, flex: 1 });
const Cell = styled('label')({
  display: 'flex', flexDirection: 'column', gap: 3,
  fontSize: 11.5, color: TEXT_LIGHT,
  [MOBILE]: { flex: '1 1 100px' },
});
const Effective = styled('span')({ fontSize: 13, minWidth: 120 });
const Note = styled('div')({ padding: '10px 16px', fontSize: 12.5, color: TEXT_LIGHT, background: '#faf9fd' });

/**
 * What each person costs per hour — the input every profit figure rests on.
 *
 * Saves on blur rather than behind a Save button: it is a grid of numbers people
 * tweak, and a form ceremony per cell is friction for no safety gain.
 * Editing a rate never restates history; existing entries keep their snapshot.
 */
export default function RatesPanel() {
  const t = useTranslations(texts);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await manageApiFetch<{ rates: Rate[] }>('/api/manage/finance/rates');
      setRates(r.rates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (rate: Rate, field: 'hourlyCost', raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value === rate[field]) return;
    setError('');
    setSavingId(rate._id);
    try {
      const r = await manageApiFetch<{ rate: Rate }>(`/api/manage/finance/rates/${rate._id}`, {
        method: 'PATCH', body: JSON.stringify({ [field]: value }),
      });
      setRates((prev) => prev.map((x) => (x._id === r.rate._id ? r.rate : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSavingId('');
    }
  };

  return (
    <Panel>
      <Head><Title>{t.employeeCost}</Title></Head>
      {error && <ErrorNote>{error}</ErrorNote>}
      {loading ? (
        <EmptyState>{t.loading}</EmptyState>
      ) : (
        rates.map((r) => (
          <Row key={r._id}>
            <Name>
              {r.name}
              {!r.tracksTime && <> <Pill tone="muted">{t.noTimeTracking}</Pill></>}
            </Name>
            <Cell>
              {t.hourlyCost}
              <SmallInput
                type="number" min="0" step="1"
                defaultValue={r.hourlyCost}
                disabled={savingId === r._id}
                style={{ width: 90 }}
                onBlur={(e) => save(r, 'hourlyCost', e.target.value)}
              />
            </Cell>
            <Effective>
              {t.effectiveCost}: <b>{formatMoney(r.effectiveHourlyCost)}</b>
            </Effective>
          </Row>
        ))
      )}
      <Note>{t.ratesNote}</Note>
    </Panel>
  );
}
