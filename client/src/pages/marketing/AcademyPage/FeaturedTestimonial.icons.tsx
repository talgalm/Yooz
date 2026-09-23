import { C } from '../shared/tokens';

/** Filled marks, not a typed glyph: a font's quotation mark changes shape and weight by fallback. */
export function QuoteMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M4.5 6.5h6v6l-2.6 5H5.1l2.1-5H4.5zM13.5 6.5h6v6l-2.6 5h-2.8l2.1-5h-2.7z"
        fill={C.blobPurple}
      />
    </svg>
  );
}
