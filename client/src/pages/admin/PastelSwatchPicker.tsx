import { styled } from '@mui/material/styles';
import { FOLDER_COLORS } from './folderColors';

const Grid = styled('div')<{ nowrap?: boolean }>(({ nowrap }) => ({
  display: 'flex',
  flexWrap: nowrap ? 'nowrap' : 'wrap',
  gap: nowrap ? 6 : 10,
  ...(nowrap ? { justifyContent: 'space-between' } : {}),
}));

const Swatch = styled('button')<{ swatch: string; selected: boolean; small?: boolean }>(({ swatch, selected, small }) => ({
  width: small ? 34 : 38,
  height: small ? 34 : 38,
  borderRadius: 10,
  background: swatch,
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
  position: 'relative',
  transition: 'transform 0.12s, box-shadow 0.12s',
  border: selected ? '2px solid #6c5ce7' : '2px solid #e0e0e0',
  boxShadow: selected ? '0 0 0 3px rgba(108,92,231,0.18)' : 'none',
  '&:hover': {
    transform: 'translateY(-1px)',
  },
  '&::after': selected
    ? {
        content: '"✓"',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#4b3fae',
        fontSize: 15,
        fontWeight: 800,
      }
    : {},
}));

interface Props {
  value: string;
  onChange: (hex: string) => void;
  singleRow?: boolean;
}

export default function PastelSwatchPicker({ value, onChange, singleRow }: Props) {
  return (
    <Grid role="radiogroup" nowrap={singleRow}>
      {FOLDER_COLORS.map((c) => (
        <Swatch
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.hex}
          aria-label={c.id}
          title={c.id}
          swatch={c.hex}
          selected={value === c.hex}
          small={singleRow}
          onClick={() => onChange(c.hex)}
        />
      ))}
    </Grid>
  );
}
