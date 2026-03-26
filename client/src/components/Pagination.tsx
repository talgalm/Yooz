import { styled } from '@mui/material/styles';
import { useTranslations } from '../context/LanguageContext';

const texts = {
  en: {
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    to: '–',
    outOf: 'of',
  },
  he: {
    page: 'עמוד',
    of: 'מתוך',
    showing: 'מציג',
    to: '–',
    outOf: 'מתוך',
  },
};

const Wrapper = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 12,
  marginTop: 16,
  marginBottom: 8,
  flexWrap: 'wrap',
});

const NavButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
  background: 'none',
  border: '1px solid #ececf3',
  borderRadius: 6,
  padding: '4px 12px',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.4 : 1,
  fontFamily: 'inherit',
  fontSize: 14,
  lineHeight: 1.4,
  transition: 'all 0.15s',
  '&:hover': {
    ...(!disabled && {
      borderColor: '#6c5ce7',
      color: '#6c5ce7',
    }),
  },
}));

const PageInfo = styled('span')({
  fontSize: 13,
  color: '#888',
  userSelect: 'none',
});

const CountInfo = styled('span')({
  fontSize: 12,
  color: '#aaa',
});

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showing?: { from: number; to: number };
  totalItems?: number;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  showing,
  totalItems,
}: PaginationProps) {
  const t = useTranslations(texts);

  if (totalPages <= 1) return null;

  return (
    <Wrapper>
      {showing && totalItems != null && (
        <CountInfo>
          {t.showing} {showing.from}{t.to}{showing.to} {t.outOf} {totalItems}
        </CountInfo>
      )}
      <NavButton
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        →
      </NavButton>
      <PageInfo>
        {t.page} {page} {t.of} {totalPages}
      </PageInfo>
      <NavButton
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ←
      </NavButton>
    </Wrapper>
  );
}
