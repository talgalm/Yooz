import { useEffect, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { manageApiFetch } from '../../../utils/manageApi';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManageReportsPage.i18n';
import { formatMoney, formatPercent, formatDate, toDateInput, HEALTH_COLORS } from '../manageTypes';
import { Table, BORDER, TEXT_LIGHT } from '../../../components/styled';
import {
  PageHeader, SectionTitle, Panel, TableScroll, Toolbar, SmallInput,
  Button, GhostButton, Tabs, Tab, EmptyState, ErrorNote, Pill, MOBILE,
} from '../manageUi';

type ReportKey =
  | 'hours_by_category' | 'hours_by_user' | 'hours_by_project'
  | 'estimate_vs_actual' | 'profitability_by_client' | 'client_activity';

const REPORTS: ReportKey[] = [
  'hours_by_category', 'hours_by_user', 'hours_by_project',
  'estimate_vs_actual', 'profitability_by_client', 'client_activity',
];
const OWNER_ONLY: ReportKey[] = ['profitability_by_client'];

const Hint = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, margin: '0 0 12px' });
const DesktopCell = styled('td')({ [MOBILE]: { display: 'none' } });
const DesktopHead = styled('th')({ [MOBILE]: { display: 'none' } });
const SubList = styled('div')({ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 3 });
const Footer = styled('div')({ padding: '10px 16px', fontSize: 12.5, color: TEXT_LIGHT, borderTop: `1px solid ${BORDER}` });

interface Row { [k: string]: unknown }

export default function ManageReportsPage() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();
  const isOwner = user?.role === 'owner';

  const monthStart = new Date();
  monthStart.setDate(1);
  const [key, setKey] = useState<ReportKey>('hours_by_category');
  const [from, setFrom] = useState(toDateInput(monthStart.toISOString()));
  const [to, setTo] = useState(toDateInput(new Date().toISOString()));
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<{ projectCount?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const visible = REPORTS.filter((r) => isOwner || !OWNER_ONLY.includes(r));

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const r = await manageApiFetch<{ rows?: Row[]; stages?: Row[]; projectCount?: number }>(
        `/api/manage/reports/${key}?from=${from}&to=${to}`,
      );
      setRows(r.rows ?? r.stages ?? []);
      setMeta({ projectCount: r.projectCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [key, from, to]);

  useEffect(() => { load(); }, [load]);

  /**
   * Export goes through fetch directly rather than manageApiFetch, which parses
   * JSON. The token is attached the same way, and the server drops money
   * columns for a pm — the file can never carry more than the screen.
   */
  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await fetch(`/api/manage/reports/${key}/export?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('yz_manage_token')}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${key}_${from}_${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.title}</SectionTitle>
        <Button onClick={exportExcel} disabled={exporting || rows.length === 0}>
          {exporting ? t.exporting : t.exportExcel}
        </Button>
      </PageHeader>

      <Tabs>
        {visible.map((r) => (
          <Tab key={r} active={key === r} onClick={() => setKey(r)}>{t.reports[r]}</Tab>
        ))}
      </Tabs>

      <Hint>{t.hints[key]}</Hint>

      {/* Estimate vs actual spans all finished projects, so a range means nothing there. */}
      {key !== 'estimate_vs_actual' && key !== 'profitability_by_client' && (
        <Toolbar>
          <SmallInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <SmallInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <GhostButton onClick={load}>{t.loading.replace('...', '')}</GhostButton>
        </Toolbar>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel>
        {loading ? (
          <EmptyState>{t.loading}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>{key === 'estimate_vs_actual' ? t.noFinished : t.empty}</EmptyState>
        ) : (
          <TableScroll>
            <Table>
              <thead>
                {key === 'hours_by_category' && (
                  <tr><th>{t.category}</th><th>{t.hours}</th><th>{t.share}</th></tr>
                )}
                {key === 'hours_by_user' && (
                  <tr><th>{t.employee}</th><th>{t.hours}</th>{isOwner && <DesktopHead>{t.cost}</DesktopHead>}</tr>
                )}
                {key === 'hours_by_project' && (
                  <tr>
                    <th>{t.project}</th><DesktopHead>{t.client}</DesktopHead>
                    <DesktopHead>{t.plannedHours}</DesktopHead><th>{t.actualHours}</th>
                    {isOwner && <DesktopHead>{t.cost}</DesktopHead>}
                  </tr>
                )}
                {key === 'estimate_vs_actual' && (
                  <tr>
                    <th>{t.stage}</th><th>{t.planned}</th><th>{t.actualHours}</th>
                    <th>{t.deviation}</th><DesktopHead>{t.samples}</DesktopHead>
                  </tr>
                )}
                {key === 'profitability_by_client' && (
                  <tr>
                    <th>{t.client}</th><DesktopHead>{t.projects}</DesktopHead>
                    <th>{t.revenue}</th><th>{t.cost}</th><th>{t.profit}</th>
                    <DesktopHead>{t.margin}</DesktopHead>
                  </tr>
                )}
                {key === 'client_activity' && (
                  <tr>
                    <th>{t.client}</th><DesktopHead>{t.status}</DesktopHead>
                    <th>{t.daysSince}</th><th>{t.interactions}</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const cell = (k: string) => r[k] as never;
                  return (
                    <tr key={i} style={{ cursor: 'default' }}>
                      {key === 'hours_by_category' && (
                        <>
                          <td>{t.categories[cell('category') as keyof typeof t.categories] ?? cell('category')}</td>
                          <td><b>{cell('hours')}</b></td>
                          <td>{formatPercent(Number(r.share))}</td>
                        </>
                      )}
                      {key === 'hours_by_user' && (
                        <>
                          <td>
                            <b>{cell('name')}</b>
                            <SubList>
                              {(r.projects as { name: string; hours: number }[])
                                .map((p) => `${p.name} ${p.hours}`).join(' · ')}
                            </SubList>
                          </td>
                          <td><b>{cell('hours')}</b></td>
                          {isOwner && <DesktopCell>{formatMoney(Number(r.cost ?? 0))}</DesktopCell>}
                        </>
                      )}
                      {key === 'hours_by_project' && (
                        <>
                          <td style={{ fontWeight: 600 }}>{cell('name')}</td>
                          <DesktopCell>{(r.clientName as string) ?? '—'}</DesktopCell>
                          <DesktopCell>{cell('plannedHours')}</DesktopCell>
                          <td><b>{cell('hours')}</b></td>
                          {isOwner && <DesktopCell>{formatMoney(Number(r.cost ?? 0))}</DesktopCell>}
                        </>
                      )}
                      {key === 'estimate_vs_actual' && (
                        <>
                          <td style={{ fontWeight: 600 }}>{cell('name')}</td>
                          <td>{cell('planned')}</td>
                          <td>{cell('actual')}</td>
                          <td style={{ color: Number(r.deviation) > 0 ? HEALTH_COLORS.red : HEALTH_COLORS.green }}>
                            {formatPercent(Number(r.deviation))}
                            {' '}
                            <Pill tone={Number(r.deviation) > 0 ? 'warn' : 'muted'}>
                              {Number(r.deviation) > 0 ? t.overBudget : t.underBudget}
                            </Pill>
                          </td>
                          <DesktopCell>{cell('samples')}</DesktopCell>
                        </>
                      )}
                      {key === 'profitability_by_client' && (
                        <>
                          <td style={{ fontWeight: 600 }}>{cell('name')}</td>
                          <DesktopCell>{cell('projects')}</DesktopCell>
                          <td>{formatMoney(Number(r.revenue))}</td>
                          <td>{formatMoney(Number(r.cost))}</td>
                          <td style={{ color: Number(r.profit) < 0 ? HEALTH_COLORS.red : HEALTH_COLORS.green, fontWeight: 600 }}>
                            {formatMoney(Number(r.profit))}
                          </td>
                          <DesktopCell>{formatPercent(Number(r.margin))}</DesktopCell>
                        </>
                      )}
                      {key === 'client_activity' && (
                        <>
                          <td style={{ fontWeight: 600 }}>{cell('name')}</td>
                          <DesktopCell>{cell('status')}</DesktopCell>
                          <td>
                            {r.daysSinceContact === null
                              ? <Pill tone="warn">{t.never}</Pill>
                              : `${r.daysSinceContact} · ${formatDate(r.lastContactDate as string)}`}
                          </td>
                          <td>{cell('interactions')}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableScroll>
        )}
        {key === 'estimate_vs_actual' && meta.projectCount !== undefined && (
          <Footer>{t.samples}: {meta.projectCount}</Footer>
        )}
        {!isOwner && <Footer>{t.noMoneyForPm}</Footer>}
      </Panel>
    </>
  );
}
