import { DarkHeaderActionIconButton, PuzzleDarkHeaderActionIconButton } from './styled';

interface ActivityLogoutButtonProps {
  onClick: () => void;
  ariaLabel: string;
  /** Black borders instead of white (puzzle game session header). */
  variant?: 'default' | 'puzzle';
}

export default function ActivityLogoutButton({ onClick, ariaLabel, variant = 'default' }: ActivityLogoutButtonProps) {
  const Btn = variant === 'puzzle' ? PuzzleDarkHeaderActionIconButton : DarkHeaderActionIconButton;
  return (
    <Btn type="button" onClick={onClick} aria-label={ariaLabel} title={ariaLabel}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 7l5 5-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 12H9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 5H6a2 2 0 00-2 2v10a2 2 0 002 2h3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Btn>
  );
}
