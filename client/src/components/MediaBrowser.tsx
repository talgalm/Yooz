import { useCallback, useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../context/LanguageContext';
import { adminApiFetch } from '../utils/adminApi';
import { insertCloudinaryTransform } from '../utils/participantMedia';
import { texts } from './MediaBrowser.i18n';
import { PRIMARY, BORDER, TEXT_LIGHT, ERROR } from './styled';

export interface MediaItem {
  publicId: string;
  url: string;
  resourceType: 'image' | 'video';
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  fileName?: string;
  createdAt?: string;
}

interface MediaListResponse {
  items: MediaItem[];
  nextOffset: number | null;
  total: number;
}

type TypeFilter = '' | 'image' | 'video';

/** A grid cell is 300px wide at most, so ask Cloudinary for that, not the original. */
function thumbUrl(item: MediaItem): string {
  if (item.resourceType === 'video') {
    const posterUrl = item.url.replace(/\.[a-z0-9]+$/i, '.jpg');
    return insertCloudinaryTransform(posterUrl, 'video', 'w_300,h_300,c_fill,q_auto');
  }
  return insertCloudinaryTransform(item.url, 'image', 'w_300,h_300,c_fill,q_auto');
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** `accept="image/*"` on the calling upload button → show only images. */
function initialFilter(accept?: string): TypeFilter {
  if (!accept) return '';
  const wantsImage = accept.includes('image');
  const wantsVideo = accept.includes('video') || accept.includes('audio');
  if (wantsImage && !wantsVideo) return 'image';
  if (wantsVideo && !wantsImage) return 'video';
  return '';
}

// ─── Styled ───

const Wrap = styled('div')({ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 });

const Toolbar = styled('div')({ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' });

const Search = styled('input')({
  flex: 1,
  minWidth: 160,
  padding: '8px 12px',
  borderRadius: 10,
  border: `1.5px solid ${BORDER}`,
  background: '#fafafa',
  fontSize: 13,
  fontFamily: 'inherit',
});

const Chip = styled('button')<{ active?: boolean }>(({ active }) => ({
  padding: '7px 14px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
  border: `1.5px solid ${active ? PRIMARY : BORDER}`,
  background: active ? PRIMARY : '#fff',
  color: active ? '#fff' : TEXT_LIGHT,
}));

const Grid = styled('div')({
  display: 'grid',
  gap: 12,
  overflowY: 'auto',
  minHeight: 0,
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
});

const Cell = styled('div')<{ clickable?: boolean }>(({ clickable }) => ({
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  overflow: 'hidden',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  cursor: clickable ? 'pointer' : 'default',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  '&:hover': { borderColor: PRIMARY, boxShadow: '0 2px 10px rgba(108,92,231,0.15)' },
}));

const Thumb = styled('div')({
  position: 'relative',
  aspectRatio: '1',
  background: '#f4f4f8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& img': { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
});

const PlayBadge = styled('span')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  color: '#fff',
  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  pointerEvents: 'none',
});

const Meta = styled('div')({ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 });

const Name = styled('div')({
  fontSize: 12,
  fontWeight: 600,
  color: '#444',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  direction: 'ltr',
});

const Sub = styled('div')({ fontSize: 11, color: TEXT_LIGHT, direction: 'ltr' });

const CellActions = styled('div')({ display: 'flex', gap: 4, padding: '0 8px 8px', flexWrap: 'wrap' });

const MiniBtn = styled('button')<{ danger?: boolean }>(({ danger }) => ({
  flex: 1,
  padding: '5px 6px',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 7,
  cursor: 'pointer',
  fontFamily: 'inherit',
  background: '#fafafa',
  border: `1px solid ${BORDER}`,
  color: danger ? ERROR : '#666',
  whiteSpace: 'nowrap',
  '&:hover': { background: danger ? '#fff5f4' : '#f0eefa', borderColor: danger ? ERROR : PRIMARY },
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
}));

const Center = styled('div')({ padding: 28, textAlign: 'center', color: TEXT_LIGHT, fontSize: 13 });

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 2200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
});

const Dialog = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: 22,
  maxWidth: 440,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxHeight: '80vh',
  overflowY: 'auto',
});

const UsageList = styled('ul')({
  margin: 0,
  paddingInlineStart: 20,
  fontSize: 13,
  color: '#555',
  maxHeight: 220,
  overflowY: 'auto',
});

// ─── Component ───

interface MediaBrowserProps {
  /** Mirrors the `accept` of the upload button that opened it — pre-filters the grid. */
  accept?: string;
  /** Picker mode: called with the chosen asset. */
  onPick?: (item: MediaItem) => void;
  /** Management mode: show the delete action. */
  allowDelete?: boolean;
  /** Bump to force a reload (after an upload). */
  refreshKey?: number;
}

export default function MediaBrowser({ accept, onPick, allowDelete, refreshKey = 0 }: MediaBrowserProps) {
  const t = useTranslations(texts);
  const [type, setType] = useState<TypeFilter>(initialFilter(accept));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ item: MediaItem; usage: { collection: string; name: string }[] } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async (offset?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (query) params.set('q', query);
      if (offset) params.set('offset', String(offset));
      const res = await adminApiFetch<MediaListResponse>(`/api/admin/media?${params}`);
      setItems((prev) => (offset ? [...prev, ...res.items] : res.items));
      setNextOffset(res.nextOffset);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setLoading(false);
    }
  }, [type, query, t.failed]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const copy = async (item: MediaItem) => {
    await navigator.clipboard.writeText(item.url).catch(() => {});
    setCopied(item.publicId);
    setTimeout(() => setCopied(''), 1500);
  };

  const runDelete = async (item: MediaItem, force: boolean) => {
    setDeleting(true);
    try {
      const params = new URLSearchParams({ publicId: item.publicId, resourceType: item.resourceType });
      if (force) params.set('force', 'true');
      await adminApiFetch(`/api/admin/media?${params}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.publicId !== item.publicId));
      setTotal((n) => Math.max(0, n - 1));
      setPendingDelete(null);
    } catch (err) {
      // 409 carries the list of things still pointing at this asset.
      const usage = (err as { body?: { error?: string; usage?: { collection: string; name: string }[] } }).body;
      if (usage?.error === 'in_use' && usage.usage) {
        setPendingDelete({ item, usage: usage.usage });
      } else {
        setError(err instanceof Error ? err.message : t.failed);
        setPendingDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Wrap>
      <Toolbar>
        <Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} />
        <Chip type="button" active={type === ''} onClick={() => setType('')}>{t.all}</Chip>
        <Chip type="button" active={type === 'image'} onClick={() => setType('image')}>{t.images}</Chip>
        <Chip type="button" active={type === 'video'} onClick={() => setType('video')}>{t.videos}</Chip>
        {total > 0 && <Sub>{total} {t.assets}</Sub>}
      </Toolbar>

      {error && <Center style={{ color: ERROR }}>{error}</Center>}

      <Grid>
        {items.map((item) => (
          <Cell key={item.publicId} clickable={!!onPick} onClick={onPick ? () => onPick(item) : undefined}>
            <Thumb>
              <img src={thumbUrl(item)} alt={item.fileName || item.publicId} loading="lazy" />
              {item.resourceType === 'video' && <PlayBadge>▶</PlayBadge>}
            </Thumb>
            <Meta>
              <Name title={item.publicId}>{item.fileName || item.publicId}</Name>
              <Sub>{[item.format?.toUpperCase(), formatBytes(item.bytes)].filter(Boolean).join(' · ')}</Sub>
            </Meta>
            <CellActions onClick={(e) => e.stopPropagation()}>
              {onPick && <MiniBtn type="button" onClick={() => onPick(item)}>{t.select}</MiniBtn>}
              <MiniBtn type="button" onClick={() => copy(item)}>{copied === item.publicId ? t.copied : t.copy}</MiniBtn>
              {allowDelete && (
                <MiniBtn
                  type="button"
                  danger
                  disabled={deleting}
                  onClick={() => { if (window.confirm(t.confirmDelete)) runDelete(item, false); }}
                >
                  {t.delete}
                </MiniBtn>
              )}
            </CellActions>
          </Cell>
        ))}
      </Grid>

      {loading && <Center>{t.loading}</Center>}
      {!loading && items.length === 0 && <Center>{t.empty}</Center>}
      {!loading && nextOffset !== null && (
        <Chip type="button" onClick={() => load(nextOffset)} style={{ alignSelf: 'center' }}>{t.loadMore}</Chip>
      )}

      {pendingDelete && (
        <Overlay onClick={() => setPendingDelete(null)}>
          <Dialog onClick={(e) => e.stopPropagation()}>
            <strong>{t.inUseTitle}</strong>
            <div style={{ fontSize: 13, color: '#555' }}>{t.inUseBody}</div>
            <UsageList>
              {pendingDelete.usage.map((u, i) => <li key={i}>{u.collection} — {u.name}</li>)}
            </UsageList>
            <div style={{ display: 'flex', gap: 8 }}>
              <MiniBtn type="button" onClick={() => setPendingDelete(null)}>{t.cancel}</MiniBtn>
              <MiniBtn type="button" danger disabled={deleting} onClick={() => runDelete(pendingDelete.item, true)}>
                {deleting ? t.deleting : t.deleteAnyway}
              </MiniBtn>
            </div>
          </Dialog>
        </Overlay>
      )}
    </Wrap>
  );
}
