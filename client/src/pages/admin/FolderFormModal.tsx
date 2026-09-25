import { useState } from 'react';
import { styled } from '@mui/material/styles';
import PastelSwatchPicker from './PastelSwatchPicker';
import { DEFAULT_FOLDER_COLOR } from './folderColors';

const Backdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 1200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
});

const Modal = styled('div')({
  background: '#fff',
  borderRadius: 18,
  padding: '28px 28px 24px',
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});

const ModalTitle = styled('h3')({
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  color: '#222',
});

const Field = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const FieldLabel = styled('label')({
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
});

const TextInput = styled('input')({
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e0e0e0',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s',
  '&:focus': { borderColor: '#6c5ce7' },
});

const ErrorText = styled('div')({
  color: '#d32f2f',
  fontSize: 13,
  fontWeight: 500,
});

const Actions = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
});

const GhostBtn = styled('button')({
  padding: '10px 18px',
  borderRadius: 10,
  border: '1.5px solid #e0e0e0',
  background: '#fff',
  color: '#555',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:hover': { background: '#f7f7f9' },
});

const PrimaryBtn = styled('button')({
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  background: '#6c5ce7',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
  '&:disabled': { opacity: 0.6, cursor: 'default' },
  '&:hover:not(:disabled)': { background: '#5a4bd4' },
});

interface Props {
  t: Record<string, string>;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialColor?: string;
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
}

export default function FolderFormModal({
  t,
  title,
  submitLabel,
  initialName = '',
  initialColor = DEFAULT_FOLDER_COLOR,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.emptyFolderName);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(trimmed, color);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setSaving(false);
    }
  };

  return (
    <Backdrop onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <ModalTitle>{title}</ModalTitle>
        <Field>
          <FieldLabel>{t.folderNameLabel}</FieldLabel>
          <TextInput
            autoFocus
            value={name}
            placeholder={t.folderNamePlaceholder}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </Field>
        <Field>
          <FieldLabel>{t.chooseColor}</FieldLabel>
          <PastelSwatchPicker value={color} onChange={setColor} singleRow />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <Actions>
          <GhostBtn type="button" onClick={onClose}>
            {t.cancel}
          </GhostBtn>
          <PrimaryBtn type="button" disabled={saving} onClick={handleSubmit}>
            {saving ? t.saving : submitLabel}
          </PrimaryBtn>
        </Actions>
      </Modal>
    </Backdrop>
  );
}
