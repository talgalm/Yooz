import { useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageSettingsPage.i18n';
import { BORDER, TEXT_LIGHT, PRIMARY } from '../../../components/styled';
import {
  PageHeader, SectionTitle, Panel, EmptyState, ErrorNote, Button, GhostButton,
  LinkButton, SmallInput, Pill, MOBILE,
} from '../manageUi';

interface StageEntry { key: string; name: string; percent: number }
interface CategorySetting { key: string; label: string; requiresProject: boolean }
interface SettingsData {
  stageTemplate: StageEntry[];
  timeCategories: CategorySetting[];
  thresholds: {
    nearBudget: number; overBudget: number; lowProgress: number;
    staleClientDays: number; contractEndingDays: number;
  };
  defaults: { weeklyCapacityHours: number; employerCostFactor: number; maxHoursPerDay: number };
}

const Block = styled('div')({ marginBottom: 22 });
const BlockTitle = styled('h2')({ margin: '0 0 4px', fontSize: 16, fontWeight: 700 });
const BlockHint = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, marginBottom: 10 });

const Head = styled('div')({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 10, padding: '11px 16px', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap',
});
const Row = styled('div')({
  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  padding: '10px 16px', fontSize: 14, borderBottom: `1px solid ${BORDER}`,
  '&:last-child': { borderBottom: 'none' },
});
const Label = styled('span')({ flex: 1, minWidth: 130 });
const Field = styled('label')({
  display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, color: TEXT_LIGHT,
  [MOBILE]: { flex: '1 1 110px' },
});
const Check = styled('label')({
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
});
const TotalRow = styled(Row)<{ bad?: boolean }>(({ bad }) => ({
  fontWeight: 700,
  background: bad ? '#fdecea' : '#faf9fd',
  color: bad ? '#c62828' : 'inherit',
}));
const SaveBar = styled('div')({
  display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
  padding: '12px 16px', borderTop: `1px solid ${BORDER}`, background: '#faf9fd',
});
const Saved = styled('span')({ fontSize: 13, color: PRIMARY, fontWeight: 600 });

/**
 * Owner-only. Every value here is read by live code — the stage split, the
 * health lights, the alert thresholds, the daily hour cap. Nothing on this
 * screen is decorative.
 */
export default function ManageSettingsPage() {
  const t = useTranslations(texts);
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedBlock, setSavedBlock] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await manageApiFetch<{ settings: SettingsData }>('/api/manage/settings');
      setData(r.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<SettingsData>, block: string) => {
    setError('');
    try {
      const r = await manageApiFetch<{ settings: SettingsData }>('/api/manage/settings', {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      setData(r.settings);
      setSavedBlock(block);
      setTimeout(() => setSavedBlock(''), 2500);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t.errors[code as keyof typeof t.errors] ?? code);
    }
  };

  const resetTemplate = async () => {
    try {
      const r = await manageApiFetch<{ settings: SettingsData }>('/api/manage/settings/stage-template/reset', {
        method: 'POST',
      });
      setData(r.settings);
      setSavedBlock('template');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (loading) return <EmptyState>{t.loading}</EmptyState>;
  if (!data) return <ErrorNote>{error || t.loading}</ErrorNote>;

  const templateTotal = Math.round(data.stageTemplate.reduce((a, s) => a + s.percent, 0) * 100) / 100;
  const patchLocal = (fn: (d: SettingsData) => SettingsData) => setData((prev) => (prev ? fn(prev) : prev));

  return (
    <>
      <PageHeader><SectionTitle>{t.title}</SectionTitle></PageHeader>
      {error && <ErrorNote>{error}</ErrorNote>}

      {/* ── Stage template ── */}
      <Block>
        <BlockTitle>{t.stageTemplate}</BlockTitle>
        <BlockHint>{t.stageTemplateHint}</BlockHint>
        <Panel>
          <Head>
            <b>{t.stages}</b>
            <LinkButton onClick={resetTemplate}>{t.resetTemplate}</LinkButton>
          </Head>
          {data.stageTemplate.map((s, i) => (
            <Row key={s.key}>
              <Label>
                <SmallInput
                  value={s.name}
                  style={{ width: '100%', maxWidth: 200 }}
                  onChange={(e) => patchLocal((d) => ({
                    ...d,
                    stageTemplate: d.stageTemplate.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)),
                  }))}
                />
              </Label>
              <Field>
                {t.percent}
                <SmallInput
                  type="number" min="0" step="1" value={s.percent} style={{ width: 80 }}
                  onChange={(e) => patchLocal((d) => ({
                    ...d,
                    stageTemplate: d.stageTemplate.map((x, n) => (n === i ? { ...x, percent: Number(e.target.value) } : x)),
                  }))}
                />
              </Field>
            </Row>
          ))}
          <TotalRow bad={templateTotal !== 100}>
            <Label>{t.total}</Label>
            <span>{templateTotal}%</span>
            {templateTotal !== 100 && <Pill tone="warn">{t.mustBe100}</Pill>}
          </TotalRow>
          <SaveBar>
            <Button
              onClick={() => save({ stageTemplate: data.stageTemplate }, 'template')}
              disabled={templateTotal !== 100}
            >
              {t.save}
            </Button>
            {savedBlock === 'template' && <Saved>{t.saved}</Saved>}
          </SaveBar>
        </Panel>
      </Block>

      {/* ── Time categories ── */}
      <Block>
        <BlockTitle>{t.timeCategories}</BlockTitle>
        <BlockHint>{t.timeCategoriesHint}</BlockHint>
        <Panel>
          {data.timeCategories.map((c, i) => (
            <Row key={c.key}>
              <Label>
                <SmallInput
                  value={c.label}
                  style={{ width: '100%', maxWidth: 220 }}
                  onChange={(e) => patchLocal((d) => ({
                    ...d,
                    timeCategories: d.timeCategories.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)),
                  }))}
                />
              </Label>
              <Check>
                <input
                  type="checkbox"
                  checked={c.requiresProject}
                  onChange={(e) => patchLocal((d) => ({
                    ...d,
                    timeCategories: d.timeCategories.map((x, n) => (n === i ? { ...x, requiresProject: e.target.checked } : x)),
                  }))}
                />
                {t.requiresProject}
              </Check>
            </Row>
          ))}
          <SaveBar>
            <Button onClick={() => save({ timeCategories: data.timeCategories }, 'categories')}>{t.save}</Button>
            {savedBlock === 'categories' && <Saved>{t.saved}</Saved>}
          </SaveBar>
        </Panel>
      </Block>

      {/* ── Alert thresholds ── */}
      <Block>
        <BlockTitle>{t.thresholds}</BlockTitle>
        <BlockHint>{t.thresholdsHint}</BlockHint>
        <Panel>
          {([
            ['nearBudget', t.nearBudget, 0.01, '%'],
            ['overBudget', t.overBudget, 0.01, '%'],
            ['lowProgress', t.lowProgress, 0.01, '%'],
            ['staleClientDays', t.staleClientDays, 1, 'd'],
            ['contractEndingDays', t.contractEndingDays, 1, 'd'],
          ] as [keyof SettingsData['thresholds'], string, number, string][]).map(([key, label, step, unit]) => (
            <Row key={key}>
              <Label>{label}</Label>
              <SmallInput
                type="number" min="0" step={step} value={data.thresholds[key]} style={{ width: 100 }}
                onChange={(e) => patchLocal((d) => ({
                  ...d, thresholds: { ...d.thresholds, [key]: Number(e.target.value) },
                }))}
              />
              <span style={{ fontSize: 12.5, color: TEXT_LIGHT }}>
                {unit === '%' ? `= ${Math.round(data.thresholds[key] * 100)}%` : t.days}
              </span>
            </Row>
          ))}
          <SaveBar>
            <Button onClick={() => save({ thresholds: data.thresholds }, 'thresholds')}>{t.save}</Button>
            {savedBlock === 'thresholds' && <Saved>{t.saved}</Saved>}
          </SaveBar>
        </Panel>
      </Block>

      {/* ── Defaults ── */}
      <Block>
        <BlockTitle>{t.defaults}</BlockTitle>
        <BlockHint>{t.defaultsHint}</BlockHint>
        <Panel>
          {([
            ['weeklyCapacityHours', t.weeklyCapacity, 1],
            ['maxHoursPerDay', t.maxHoursPerDay, 1],
          ] as [keyof SettingsData['defaults'], string, number][]).map(([key, label, step]) => (
            <Row key={key}>
              <Label>{label}</Label>
              <SmallInput
                type="number" min="0" step={step} value={data.defaults[key]} style={{ width: 100 }}
                onChange={(e) => patchLocal((d) => ({
                  ...d, defaults: { ...d.defaults, [key]: Number(e.target.value) },
                }))}
              />
            </Row>
          ))}
          <SaveBar>
            <Button onClick={() => save({ defaults: data.defaults }, 'defaults')}>{t.save}</Button>
            {savedBlock === 'defaults' && <Saved>{t.saved}</Saved>}
            <GhostButton onClick={load}>{t.discard}</GhostButton>
          </SaveBar>
        </Panel>
      </Block>

      <BlockHint>{t.notIncluded}</BlockHint>
    </>
  );
}
