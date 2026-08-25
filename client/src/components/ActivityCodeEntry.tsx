import { useState } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { useTranslations } from '../context/LanguageContext';
import { participantPlayPath } from '../utils/participantActivity';

const Bar = styled.form({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: 10,
  padding: '12px 16px',
  background: '#f0eefa',
  borderBottom: '1px solid #ddd6f5',
});

const Label = styled.span({ fontSize: 14, fontWeight: 700, color: '#4b3b8f' });

const CodeInput = styled.input({
  width: 130,
  padding: '9px 12px',
  fontSize: 16, // 16px keeps iOS from zooming the page on focus
  letterSpacing: 2,
  textAlign: 'center',
  border: '1px solid #c9bff0',
  borderRadius: 8,
  outline: 'none',
  background: '#fff',
});

const Go = styled.button({
  padding: '9px 18px',
  fontSize: 14,
  fontWeight: 700,
  color: '#fff',
  background: '#6c5ce7',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  '&:disabled': { background: '#b8b0e8', cursor: 'default' },
});

const texts = {
  en: { label: 'Have an activity code?', placeholder: 'code', go: 'Enter' },
  he: { label: 'יש לכם קוד פעילות?', placeholder: 'קוד', go: 'כניסה' },
};

/**
 * Way back into an activity for a participant who lost the tab and no longer has
 * the QR in front of them — the server resumes their report on re-login.
 */
export default function ActivityCodeEntry() {
  const t = useTranslations(texts);
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  // Codes are 6 lowercase alphanumerics; phone keyboards love to capitalize.
  const clean = code.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    <Bar
      onSubmit={(e) => {
        e.preventDefault();
        if (clean) navigate(participantPlayPath(clean));
      }}
    >
      <Label>{t.label}</Label>
      <CodeInput
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t.placeholder}
        maxLength={12}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        dir="ltr"
      />
      <Go type="submit" disabled={!clean}>{t.go}</Go>
    </Bar>
  );
}
