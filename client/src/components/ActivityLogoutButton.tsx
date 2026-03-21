import { IconButton } from './styled';

interface ActivityLogoutButtonProps {
  onClick: () => void;
  ariaLabel: string;
}

export default function ActivityLogoutButton({ onClick, ariaLabel }: ActivityLogoutButtonProps) {
  return (
    <IconButton
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        color: '#fff',
        borderColor: 'rgba(255,255,255,0.45)',
        background: 'rgba(255,255,255,0.08)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    </IconButton>
  );
}
