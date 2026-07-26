import { useEffect, useMemo, useState } from "react";
import { styled } from "@mui/material/styles";
import { useTranslations } from "../../../context/LanguageContext";
import {
  useParticipantsRoster,
  saveExclusions,
  resetParticipantProgress,
} from "../../../hooks/useAnalytics";
import { texts } from "./AdminStatisticsTab.i18n";
import {
  EmptyState,
  FullPanel,
  PanelTitle,
  ParticipantTable,
  PassGradePreset,
  RosterActions,
  RosterCheckbox,
  RosterSearchInput,
  RosterToolbar,
  ValueBadge,
} from "./styled";
import type { RosterParticipant } from "./types";

const RowActionButton = styled("button")({
  width: 32,
  height: 32,
  border: "1px solid #ececf3",
  borderRadius: 8,
  background: "#fff",
  color: "#6c5ce7",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  fontFamily: "inherit",
  fontSize: 20,
  lineHeight: 1,
  "&:hover": {
    background: "#f5f3ff",
    borderColor: "#6c5ce7",
  },
});

const RowActionMenu = styled("div")({
  position: "fixed",
  zIndex: 1100,
  background: "#fff",
  border: "1px solid #e0d8f0",
  borderRadius: 14,
  boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
  minWidth: 170,
  overflow: "hidden",
});

const RowActionMenuItem = styled("button")<{
  danger?: boolean;
  confirm?: boolean;
}>(({ danger, confirm }) => ({
  display: "block",
  width: "100%",
  padding: "12px 16px",
  textAlign: "start",
  background: confirm ? "#c62828" : "none",
  color: confirm ? "#fff" : danger ? "#c62828" : "#333",
  fontWeight: confirm ? 700 : 500,
  fontSize: 14,
  border: "none",
  borderBottom: "1px solid #f0ecfa",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  "&:last-child": { borderBottom: "none" },
  "&:hover": {
    background: confirm
      ? "#a01818"
      : danger
        ? "rgba(198,40,40,0.07)"
        : "rgba(108,92,231,0.07)",
  },
}));

interface Props {
  activityId: string | null;
  /** Called after exclusions are persisted so the dashboard panels can refetch. */
  onExclusionsChanged?: () => void;
}

function template(text: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    text,
  );
}

function statusTone(
  status: RosterParticipant["status"],
): "green" | "blue" | "amber" {
  if (status === "completed") return "green";
  if (status === "in_progress") return "blue";
  return "amber";
}

export default function ParticipantsRoster({
  activityId,
  onExclusionsChanged,
}: Props) {
  const t = useTranslations(texts);
  const { data: roster, loading, refetch } = useParticipantsRoster(activityId);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [menuReportId, setMenuReportId] = useState<string | null>(null);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);

  // Seed the local exclusion set from the server roster (and re-seed on refetch).
  useEffect(() => {
    if (roster)
      setExcluded(new Set(roster.filter((p) => p.excluded).map((p) => p._id)));
  }, [roster]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest("[data-row-action-menu]")) return;
      if (target && target.closest("[data-row-action-trigger]")) return;
      setMenuAnchorRect(null);
      setMenuReportId(null);
      setConfirmResetId(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuAnchorRect(null);
        setMenuReportId(null);
        setConfirmResetId(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save immediately and optimistically: only the local checkbox state changes —
  // the roster itself never reloads. Reverts if the save fails. The dashboard
  // panels are refreshed lazily by the parent when next viewed, not on each click.
  const commit = (next: Set<string>, previous: Set<string>) => {
    if (!activityId) return;
    setExcluded(next);
    saveExclusions(activityId, [...next])
      .then(() => onExclusionsChanged?.())
      .catch(() => {
        setError(t.exclusionSaveFailed);
        setExcluded(previous);
      });
  };

  const toggle = (id: string) => {
    setError(null);
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commit(next, excluded);
  };

  const includeAll = () => {
    setError(null);
    commit(new Set<string>(), excluded);
  };

  const closeActionMenu = () => {
    setMenuAnchorRect(null);
    setMenuReportId(null);
    setConfirmResetId(null);
  };

  const openActionMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    reportId: string,
  ) => {
    event.stopPropagation();
    setMenuReportId(reportId);
    setConfirmResetId(null);
    setMenuAnchorRect(event.currentTarget.getBoundingClientRect());
  };

  const handleResetProgress = async (reportId: string) => {
    if (!activityId) return;
    if (confirmResetId !== reportId) {
      setConfirmResetId(reportId);
      return;
    }

    setError(null);
    setResettingId(reportId);
    try {
      await resetParticipantProgress(activityId, reportId);
      await refetch();
      closeActionMenu();
    } catch {
      setError(t.resetProgressFailed);
    } finally {
      setResettingId(null);
    }
  };

  const statusLabel = (status: RosterParticipant["status"]) =>
    status === "completed"
      ? t.completedLabel
      : status === "in_progress"
        ? t.inProgress
        : t.joinedOnly;

  const formatDate = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
  };

  const filtered = useMemo(() => {
    if (!roster) return [];
    const query = search.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(query) ||
        (p.group || "").toLowerCase().includes(query),
    );
  }, [roster, search]);

  if (loading && !roster) return <EmptyState>{t.loading}</EmptyState>;
  if (!roster || roster.length === 0)
    return <EmptyState>{t.noParticipants}</EmptyState>;

  const excludedCount = excluded.size;

  const actionMenuStyle = (rect: DOMRect | null) => {
    if (!rect) return { display: "none" };
    const top = Math.min(rect.bottom + 6, window.innerHeight - 120);
    const left = Math.min(rect.left, window.innerWidth - 190);
    return { top, left };
  };

  return (
    <FullPanel>
      <RosterToolbar>
        <PanelTitle style={{ margin: 0 }}>{t.participantsTab}</PanelTitle>
        <RosterActions>
          <ValueBadge tone={excludedCount > 0 ? "amber" : "neutral"}>
            {template(t.excludedCount, { count: excludedCount })}
          </ValueBadge>
          <PassGradePreset
            type="button"
            onClick={includeAll}
            disabled={excludedCount === 0}
          >
            {t.includeAll}
          </PassGradePreset>
        </RosterActions>
      </RosterToolbar>

      <div
        style={{
          fontSize: 12,
          color: "#697586",
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        {t.excludeHint}
      </div>

      <RosterSearchInput
        placeholder={t.searchParticipants}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && (
        <div style={{ color: "#e74c3c", fontSize: 13, margin: "10px 0 0" }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <ParticipantTable>
          <thead>
            <tr>
              <th>{t.included}</th>
              <th>{t.participant}</th>
              <th>{t.group}</th>
              <th>{t.statusHeader}</th>
              <th>{t.score}</th>
              <th>{t.joined}</th>
              <th aria-label={t.actions} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isExcluded = excluded.has(p._id);
              return (
                <tr key={p._id} style={{ opacity: isExcluded ? 0.45 : 1 }}>
                  <td>
                    <RosterCheckbox
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggle(p._id)}
                      aria-label={t.excludeFromStats}
                    />
                  </td>
                  <td
                    style={{
                      fontWeight: 700,
                      textDecoration: isExcluded ? "line-through" : "none",
                    }}
                  >
                    {p.name || "-"}
                  </td>
                  <td>{p.group || "-"}</td>
                  <td>
                    <ValueBadge tone={statusTone(p.status)}>
                      {statusLabel(p.status)}
                    </ValueBadge>
                  </td>
                  <td>{Math.round(p.score)}</td>
                  <td>{formatDate(p.joinedAt)}</td>
                  <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                    <RowActionButton
                      type="button"
                      aria-label={t.resetProgress}
                      data-row-action-trigger
                      onClick={(event) => openActionMenu(event, p._id)}
                    >
                      ⋮
                    </RowActionButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ParticipantTable>
      </div>

      {menuReportId && menuAnchorRect && (
        <div data-row-action-menu style={actionMenuStyle(menuAnchorRect)}>
          <RowActionMenu style={actionMenuStyle(menuAnchorRect)}>
            <RowActionMenuItem
              type="button"
              danger
              confirm={confirmResetId === menuReportId}
              onClick={() => handleResetProgress(menuReportId)}
              disabled={resettingId === menuReportId}
            >
              {resettingId === menuReportId
                ? t.resetting
                : confirmResetId === menuReportId
                  ? t.confirmReset
                  : t.resetProgress}
            </RowActionMenuItem>
          </RowActionMenu>
        </div>
      )}
    </FullPanel>
  );
}
