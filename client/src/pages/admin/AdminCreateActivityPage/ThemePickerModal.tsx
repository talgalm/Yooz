import { styled } from '@mui/material/styles';
import { getThemeKit } from '../../StoryModulePage/roadmapThemes';
import type { CustomTheme } from './ThemeFormModal';

/** One selectable theme, flattened to the three colours a preview needs. */
export interface ThemeOption {
  id: string; // '' is the built-in default
  name: string;
  scene: string;
  road: string;
  node: string;
  image?: string;
  custom?: CustomTheme;
}

/** Built-in themes, painted from the very kits the participant roadmap renders,
 *  so a preview here can never drift from what players actually see. */
export function builtInThemeOptions(t: Record<string, string>): ThemeOption[] {
  const paint = (id: string) => {
    const kit = getThemeKit(id);
    return { scene: kit.sceneBgMid, road: kit.roadSurface, node: kit.nodeActiveBg };
  };
  return [
    { id: '', name: t.themeDefault, ...paint('') },
    { id: 'ocean', name: t.themeOcean, ...paint('ocean') },
    { id: 'desert', name: t.themeDesert, ...paint('desert') },
    { id: 'office', name: t.themeOffice, ...paint('office') },
    { id: 'ganei-yehoshua', name: t.themeGaneiYehoshua, ...paint('ganei-yehoshua') },
  ];
}

export function customThemeOption(ct: CustomTheme): ThemeOption {
  return {
    id: ct._id,
    name: ct.name,
    scene: ct.bgColor || ct.mainColor || '#8fb247',
    road: ct.roadmapPathColor || '#3a291a',
    node: ct.roadmapActiveNodeColor || ct.mainColor || '#d4e84e',
    image: ct.roadmapImage,
    custom: ct,
  };
}

/** Miniature of the roadmap: scene colour, the path across it, one lit node —
 *  which is exactly how the theme renders for players. A custom theme's roadmap
 *  image layers over the scene colour, so a missing or broken image degrades to
 *  the colours rather than to an empty tile. */
const swatch = (height: number, radius: number) => ({
  scene,
  road,
  node,
  image,
}: { scene: string; road: string; node: string; image?: string }) => ({
  position: 'relative' as const,
  display: 'block',
  width: '100%',
  height,
  borderRadius: radius,
  overflow: 'hidden',
  flexShrink: 0,
  border: '1px solid rgba(0,0,0,0.08)',
  background: image
    ? `center / cover no-repeat url(${image}), ${scene}`
    : scene,
  '&::before': {
    content: '""',
    position: 'absolute',
    insetInlineStart: 0,
    insetInlineEnd: 0,
    bottom: '26%',
    height: '16%',
    background: road,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    insetInlineEnd: '20%',
    bottom: '22%',
    width: height * 0.26,
    height: height * 0.26,
    borderRadius: '50%',
    background: node,
    border: '2px solid rgba(0,0,0,0.28)',
    boxSizing: 'border-box' as const,
  },
});

export const ThemeSwatch = styled('span')<{ scene: string; road: string; node: string; image?: string }>(
  swatch(64, 10),
);

/** Row-sized swatch for the collapsed control on the form. */
export const ThemeSwatchTiny = styled('span')<{ scene: string; road: string; node: string; image?: string }>(
  swatch(34, 8),
);

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  boxSizing: 'border-box',
});

const Card = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '24px 28px',
  width: 'min(680px, 100%)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxSizing: 'border-box',
  '@media (max-width: 600px)': { padding: '20px 18px' },
});

const Title = styled('h3')({
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: '#333',
});

const Grid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 12,
  '@media (max-width: 600px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
});

const Tile = styled('button')<{ selected?: boolean }>(({ selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 10,
  borderRadius: 14,
  border: `2px solid ${selected ? '#6c5ce7' : '#e8e8ec'}`,
  background: selected ? '#f5f0ff' : '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'start',
  transition: 'border-color 0.15s, background 0.15s',
  '&:hover': { borderColor: '#6c5ce7' },
}));

const TileName = styled('span')({
  fontSize: 13,
  fontWeight: 600,
  color: '#333',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const TileActions = styled('div')({
  display: 'flex',
  gap: 6,
});

const TinyButton = styled('span')<{ danger?: boolean }>(({ danger }) => ({
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 6,
  border: `1px solid ${danger ? '#e3bdb8' : '#ddd'}`,
  color: danger ? '#c0392b' : '#666',
  cursor: 'pointer',
  '&:hover': { background: danger ? '#fdeeea' : '#f5f5f7' },
}));

const NewTile = styled('button')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 110,
  borderRadius: 14,
  border: '2px dashed #d4d4dc',
  background: 'transparent',
  color: '#888',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { borderColor: '#6c5ce7', color: '#6c5ce7', background: '#faf9ff' },
});

const Actions = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
  paddingTop: 4,
});

const DoneButton = styled('button')({
  background: '#6c5ce7',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 24px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#5a4bd1' },
});

interface ThemePickerModalProps {
  value: string;
  options: ThemeOption[];
  canCreate: boolean;
  canManage: (theme: CustomTheme) => boolean;
  onChange: (id: string) => void;
  onCreate: () => void;
  onEdit: (theme: CustomTheme) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  t: Record<string, string>;
}

/** Every theme in one place, each shown as a miniature of the roadmap it
 *  produces — keeps the form itself down to a single collapsed row. */
export default function ThemePickerModal({
  value,
  options,
  canCreate,
  canManage,
  onChange,
  onCreate,
  onEdit,
  onDelete,
  onClose,
  t,
}: ThemePickerModalProps) {
  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Title>{t.themePickerTitle}</Title>
        <Grid>
          {canCreate && (
            <NewTile type="button" onClick={onCreate}>
              + {t.themeAddNew}
            </NewTile>
          )}
          {options.map((opt) => (
            <Tile
              key={opt.id || 'default'}
              type="button"
              selected={value === opt.id}
              onClick={() => onChange(opt.id)}
            >
              <ThemeSwatch scene={opt.scene} road={opt.road} node={opt.node} image={opt.image} />
              <TileName>{opt.name}</TileName>
              {opt.custom && canManage(opt.custom) && (
                <TileActions>
                  <TinyButton
                    role="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(opt.custom!); }}
                  >
                    {t.themeEdit}
                  </TinyButton>
                  <TinyButton
                    role="button"
                    danger
                    onClick={(e) => { e.stopPropagation(); onDelete(opt.id); }}
                  >
                    {t.themeDelete}
                  </TinyButton>
                </TileActions>
              )}
            </Tile>
          ))}
        </Grid>
        <Actions>
          <DoneButton type="button" onClick={onClose}>{t.closePreview}</DoneButton>
        </Actions>
      </Card>
    </Overlay>
  );
}
