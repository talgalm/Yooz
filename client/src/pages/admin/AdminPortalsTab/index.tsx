import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminPortalsTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import {
  AdminCard,
  Table,
  Chip,
  DesktopOnly,
  HideOnDesktop,
  MobileCardList,
  MobileCardItem,
  Input,
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
import { styled } from '@mui/material/styles';

const SearchInput = styled(Input)({
  flex: 1,
  minWidth: 0,
  padding: '10px 14px',
  fontSize: 14,
  marginBottom: 16,
  '@media (min-width: 601px)': {
    minWidth: 200,
  },
});

const CodeChip = styled(Chip)({
  fontFamily: 'monospace',
  fontSize: 12,
});

export interface Portal {
  _id: string;
  name: string;
  code: string;
  description?: string;
  users: { _id: string; username: string; status: string }[];
  activities: { _id: string; name: string; code: string; status: string }[];
  createdAt: string;
  createdByEmail?: string;
}

interface AdminPortalsTabProps {
  portals: Portal[];
  onRefresh: () => void;
}

export default function AdminPortalsTab({ portals, onRefresh }: AdminPortalsTabProps) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const t = useTranslations(texts);

  const filtered = useMemo(() => {
    if (!search.trim()) return portals;
    const q = search.trim().toLowerCase();
    return portals.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [portals, search]);

  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(filtered);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await adminApiFetch(`/api/admin/portals/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    onRefresh();
  };

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        <SmallActionButton onClick={() => navigate('/admin/portals/new')}>
          {t.createNew}
        </SmallActionButton>
      </SectionHeaderRow>

      <SearchInput
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {portals.length === 0 ? (
        <AdminCard>
          <EmptyText>{t.noPortals}</EmptyText>
        </AdminCard>
      ) : (
        <>
          <DesktopOnly>
            <AdminCardNoPadding>
              <Table>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.code}</th>
                    <th>{t.users}</th>
                    <th>{t.activities}</th>
                    <th>{t.created}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((portal) => (
                    <tr key={portal._id} onClick={() => navigate(`/admin/portals/${portal._id}`)}>
                      <td><CellBold>{portal.name}</CellBold></td>
                      <td><CodeChip>{portal.code}</CodeChip></td>
                      <td><Chip>{portal.users.length}</Chip></td>
                      <td><Chip>{portal.activities.length}</Chip></td>
                      <td><CellMuted>{new Date(portal.createdAt).toLocaleDateString()}</CellMuted></td>
                      <CellAlignEnd>
                        <SmallDangerButton
                          confirm={confirmDeleteId === portal._id}
                          onClick={(e) => { e.stopPropagation(); handleDelete(portal._id); }}
                        >
                          {confirmDeleteId === portal._id ? t.confirmDelete : t.delete}
                        </SmallDangerButton>
                      </CellAlignEnd>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </AdminCardNoPadding>
          </DesktopOnly>

          <HideOnDesktop>
            <MobileCardList>
              {pageItems.map((portal) => (
                <MobileCardItem key={portal._id} onClick={() => navigate(`/admin/portals/${portal._id}`)}>
                  <MobileCardHeader>
                    <div>
                      <MobileCardNameRow>{portal.name}</MobileCardNameRow>
                      <MobileCardRow>
                        <CodeChip>{portal.code}</CodeChip>
                        <Chip>{portal.users.length} {t.users}</Chip>
                        <Chip>{portal.activities.length} {t.activities}</Chip>
                      </MobileCardRow>
                      <MobileCardRow>
                        <MobileCardDate>{new Date(portal.createdAt).toLocaleDateString()}</MobileCardDate>
                      </MobileCardRow>
                    </div>
                    <SmallDangerButton
                      confirm={confirmDeleteId === portal._id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(portal._id); }}
                    >
                      {confirmDeleteId === portal._id ? t.confirmDelete : t.delete}
                    </SmallDangerButton>
                  </MobileCardHeader>
                </MobileCardItem>
              ))}
            </MobileCardList>
          </HideOnDesktop>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
        </>
      )}
    </>
  );
}
