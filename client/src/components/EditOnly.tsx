import type { ReactNode } from 'react';
import { styled } from '@mui/material/styles';
import { useCanEditContent } from '../context/AdminAuthContext';
import { useTranslations } from '../context/LanguageContext';
import { texts } from './EditOnly.i18n';

const Notice = styled('p')({
  margin: 0,
  padding: '10px 14px',
  borderRadius: 10,
  background: '#f5f3ff',
  border: '1px solid #ddd6fe',
  color: '#5b4cd4',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
});

interface Props {
  children: ReactNode;
  /** Show a "view only" line where the hidden control was (use for save buttons). */
  notice?: boolean;
}

/**
 * Renders its children only for roles that may change content. A `viewer` gets
 * nothing, or the notice. The server refuses their writes regardless.
 */
export default function EditOnly({ children, notice = false }: Props) {
  const canEdit = useCanEditContent();
  const t = useTranslations(texts);
  if (canEdit) return <>{children}</>;
  return notice ? <Notice>{t.viewOnly}</Notice> : null;
}
