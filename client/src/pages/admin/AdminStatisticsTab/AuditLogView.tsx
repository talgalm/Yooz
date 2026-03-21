import { useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { useAuditLog } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import {
  SectionHeader,
  SectionTitle,
  BackButton,
  ChartCard,
  StatsTable,
  StatsMobileCard,
  StatsMobileRow,
  StatsMobileLabel,
  StatsMobileValue,
} from './styled';
import { DesktopOnly, HideOnDesktop } from '../../../components/styled';

interface Props {
  onBack: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogView({ onBack }: Props) {
  const t = useTranslations(texts);
  const [page, setPage] = useState(1);
  const { data, loading } = useAuditLog(page, 20);

  return (
    <>
      <SectionHeader>
        <SectionTitle>{t.auditLog}</SectionTitle>
        <BackButton onClick={onBack}>← {t.back}</BackButton>
      </SectionHeader>

      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.loading}</div>
      )}

      {data && data.entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.noData}</div>
      )}

      {data && data.entries.length > 0 && (
        <>
          <DesktopOnly>
            <ChartCard style={{ padding: 0, overflow: 'hidden' }}>
              <StatsTable>
                <thead>
                  <tr>
                    <th>{t.adminEmail}</th>
                    <th>{t.action}</th>
                    <th>{t.target}</th>
                    <th>{t.timestamp}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry._id} style={{ cursor: 'default' }}>
                      <td>{entry.adminEmail}</td>
                      <td>
                        <span
                          style={{
                            background: '#f0efff',
                            color: '#6c5ce7',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td>{entry.targetName || entry.targetId || '—'}</td>
                      <td style={{ color: '#888' }}>{formatDate(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </StatsTable>
            </ChartCard>
          </DesktopOnly>

          <HideOnDesktop>
            {data.entries.map((entry) => (
              <StatsMobileCard key={entry._id} style={{ cursor: 'default' }}>
                <StatsMobileRow>
                  <StatsMobileValue>{entry.adminEmail}</StatsMobileValue>
                  <span
                    style={{
                      background: '#f0efff',
                      color: '#6c5ce7',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {entry.action}
                  </span>
                </StatsMobileRow>
                <StatsMobileRow>
                  <StatsMobileLabel>{entry.targetName || '—'}</StatsMobileLabel>
                  <StatsMobileLabel>{formatDate(entry.createdAt)}</StatsMobileLabel>
                </StatsMobileRow>
              </StatsMobileCard>
            ))}
          </HideOnDesktop>

          {/* Pagination */}
          {data.pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginTop: 16,
              }}
            >
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={{
                  background: 'none',
                  border: '1px solid #ececf3',
                  borderRadius: 6,
                  padding: '4px 12px',
                  cursor: page <= 1 ? 'default' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                  fontFamily: 'inherit',
                }}
              >
                ←
              </button>
              <span style={{ fontSize: 13, color: '#888' }}>
                {t.page} {page} {t.of} {data.pages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.pages, page + 1))}
                disabled={page >= data.pages}
                style={{
                  background: 'none',
                  border: '1px solid #ececf3',
                  borderRadius: 6,
                  padding: '4px 12px',
                  cursor: page >= data.pages ? 'default' : 'pointer',
                  opacity: page >= data.pages ? 0.4 : 1,
                  fontFamily: 'inherit',
                }}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
