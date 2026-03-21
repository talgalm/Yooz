import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminGamesTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import type { Game } from '../AdminDashboardPage';
import {
  AdminCard,
  Table,
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

interface AdminGamesTabProps {
  games: Game[];
  gameType: string;
  title: string;
  onRefresh: () => void;
}

export default function AdminGamesTab({ games, gameType, title, onRefresh }: AdminGamesTabProps) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const t = useTranslations(texts);

  const filtered = games.filter((g) => g.type === gameType);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await adminApiFetch(`/api/admin/games/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    onRefresh();
  };

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{title}</PageTitleNoMargin>
        <SmallActionButton onClick={() => navigate(`/admin/games/new?type=${gameType}`)}>
          {t.createNew}
        </SmallActionButton>
      </SectionHeaderRow>

      {filtered.length === 0 ? (
        <AdminCard>
          <EmptyText>{t.noGames}</EmptyText>
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
                    <th>{t.created}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((game) => (
                    <tr key={game._id} onClick={() => navigate(`/admin/games/${game._id}`)}>
                      <td>
                        <CellBold>{game.name}</CellBold>
                        {(game.customer || game.theme) && (
                          <CellMuted style={{ fontSize: 12 }}>
                            {[game.customer, game.theme].filter(Boolean).join(' · ')}
                          </CellMuted>
                        )}
                      </td>
                      <td><CellMuted>{new Date(game.createdAt).toLocaleDateString()}</CellMuted></td>
                      <CellAlignEnd>
                        <SmallDangerButton
                          confirm={confirmDeleteId === game._id}
                          onClick={(e) => { e.stopPropagation(); handleDelete(game._id); }}
                        >
                          {confirmDeleteId === game._id ? t.confirmDelete : t.delete}
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
              {filtered.map((game) => (
                <MobileCardItem key={game._id} onClick={() => navigate(`/admin/games/${game._id}`)}>
                  <MobileCardHeader>
                    <div>
                      <MobileCardNameRow>{game.name}</MobileCardNameRow>
                      {(game.customer || game.theme) && (
                        <CellMuted style={{ fontSize: 12 }}>
                          {[game.customer, game.theme].filter(Boolean).join(' · ')}
                        </CellMuted>
                      )}
                      <MobileCardRow>
                        <MobileCardDate>{new Date(game.createdAt).toLocaleDateString()}</MobileCardDate>
                      </MobileCardRow>
                    </div>
                    <SmallDangerButton
                      confirm={confirmDeleteId === game._id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(game._id); }}
                    >
                      {confirmDeleteId === game._id ? t.confirmDelete : t.delete}
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
