import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationsTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import type { Station } from '../AdminDashboardPage';
import {
  AdminCard,
  Table,
  Chip,
  DesktopOnly,
  HideOnDesktop,
  MobileCardList,
  MobileCardItem,
} from '../../../components/styled';
import {
  SectionHeaderRow,
  PageTitleNoMargin,
  SmallActionButton,
  EmptyText,
  AdminCardNoPadding,
  SmallDangerButton,
  CellBold,
  CellMuted,
  CellAlignEnd,
  MobileCardHeader,
  MobileCardNameRow,
  MobileCardRow,
  MobileCardDate,
} from '../styled';

interface AdminStationsTabProps {
  stations: Station[];
  onRefresh: () => void;
}

export default function AdminStationsTab({ stations, onRefresh }: AdminStationsTabProps) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const t = useTranslations(texts);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await adminApiFetch(`/api/admin/stations/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    onRefresh();
  };

  const typeLabel = (type?: string) => {
    switch (type) {
      case 'text': return t.typeText;
      case 'video': return t.typeVideo;
      case 'image': return t.typeImage;
      case 'narrative': return t.typeNarrative;
      case 'badge': return t.typeBadge;
      default: return type || '—';
    }
  };

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        <SmallActionButton onClick={() => navigate('/admin/stations/new')}>
          {t.createNew}
        </SmallActionButton>
      </SectionHeaderRow>

      {stations.length === 0 ? (
        <AdminCard>
          <EmptyText>{t.noStations}</EmptyText>
        </AdminCard>
      ) : (
        <>
          {/* Desktop table */}
          <DesktopOnly>
            <AdminCardNoPadding>
              <Table>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.type}</th>
                    <th>{t.created}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station) => (
                    <tr key={station._id} onClick={() => navigate(`/admin/stations/${station._id}`)}>
                      <td>
                        <CellBold>{station.name}</CellBold>
                        {(station.customer || station.theme) && (
                          <CellMuted style={{ fontSize: 12 }}>
                            {[station.customer, station.theme].filter(Boolean).join(' · ')}
                          </CellMuted>
                        )}
                      </td>
                      <td>
                        <Chip>{typeLabel(station.type)}</Chip>
                      </td>
                      <td><CellMuted>{new Date(station.createdAt).toLocaleDateString()}</CellMuted></td>
                      <CellAlignEnd>
                        <SmallDangerButton
                          confirm={confirmDeleteId === station._id}
                          onClick={(e) => { e.stopPropagation(); handleDelete(station._id); }}
                        >
                          {confirmDeleteId === station._id ? t.confirmDelete : t.delete}
                        </SmallDangerButton>
                      </CellAlignEnd>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </AdminCardNoPadding>
          </DesktopOnly>

          {/* Mobile cards */}
          <HideOnDesktop>
            <MobileCardList>
              {stations.map((station) => (
                <MobileCardItem key={station._id} onClick={() => navigate(`/admin/stations/${station._id}`)}>
                  <MobileCardHeader>
                    <div>
                      <MobileCardNameRow>{station.name}</MobileCardNameRow>
                      {(station.customer || station.theme) && (
                        <CellMuted style={{ fontSize: 12 }}>
                          {[station.customer, station.theme].filter(Boolean).join(' · ')}
                        </CellMuted>
                      )}
                      <MobileCardRow>
                        <Chip>{typeLabel(station.type)}</Chip>
                        <MobileCardDate>{new Date(station.createdAt).toLocaleDateString()}</MobileCardDate>
                      </MobileCardRow>
                    </div>
                    <SmallDangerButton
                      confirm={confirmDeleteId === station._id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(station._id); }}
                    >
                      {confirmDeleteId === station._id ? t.confirmDelete : t.delete}
                    </SmallDangerButton>
                  </MobileCardHeader>
                </MobileCardItem>
              ))}
            </MobileCardList>
          </HideOnDesktop>
        </>
      )}
    </>
  );
}
