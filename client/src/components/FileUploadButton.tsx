import { useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { adminUploadFile } from '../utils/adminApi';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTranslations } from '../context/LanguageContext';
import MediaBrowser from './MediaBrowser';
import { texts } from './FileUploadButton.i18n';

const UploadBtn = styled('button')({
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  background: '#fafafa',
  color: '#555',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
  '&:hover': {
    background: '#f0eefa',
    borderColor: '#6c5ce7',
    color: '#6c5ce7',
  },
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

const HiddenFileInput = styled('input')({
  display: 'none',
});

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
});

const Modal = styled('div')({
  background: '#fff',
  borderRadius: 18,
  padding: 20,
  width: 'min(880px, 100%)',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  minHeight: 0,
});

const ModalHead = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
});

const Tabs = styled('div')({ display: 'flex', gap: 8 });

const Tab = styled('button')<{ active?: boolean }>(({ active }) => ({
  padding: '8px 16px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: `1.5px solid ${active ? '#6c5ce7' : '#e0e0e0'}`,
  background: active ? '#f0eefa' : '#fff',
  color: active ? '#6c5ce7' : '#888',
}));

const CloseBtn = styled('button')({
  border: 'none',
  background: 'transparent',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  color: '#999',
  padding: 4,
});

const DropZone = styled('button')({
  border: '2px dashed #d9d9e3',
  borderRadius: 14,
  background: '#fafafa',
  padding: '48px 20px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  color: '#666',
  '&:hover': { borderColor: '#6c5ce7', color: '#6c5ce7', background: '#f7f6fd' },
  '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
});

interface FileUploadButtonProps {
  /** Accepted file types, e.g. "image/*", "video/*", "image/*,video/*" */
  accept: string;
  /** Called with the uploaded file URL on success */
  onUploaded: (url: string, file?: File) => void;
  /** Button label */
  label?: string;
  /** Uploading label */
  uploadingLabel?: string;
  /** Cloudinary folder to upload into (media library only; defaults to the root). */
  folder?: string;
}

export default function FileUploadButton({ accept, onUploaded, label = 'Upload', uploadingLabel = 'Uploading...', folder }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<'computer' | 'library'>('computer');
  const t = useTranslations(texts);
  const { admin } = useAdminAuth();

  // The media library is admin-only (so is the API behind it). Anyone else
  // keeps the plain file dialog they have always had.
  const canBrowseLibrary = admin?.role === 'admin' || admin?.role === 'super_admin';

  const handleClick = () => {
    if (canBrowseLibrary) {
      setTab('computer');
      setPickerOpen(true);
      return;
    }
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await adminUploadFile(file, folder);
      setPickerOpen(false);
      onUploaded(result.url, file);
    } catch (err) {
      console.error('Upload failed:', err);
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <HiddenFileInput
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
      />
      <UploadBtn type="button" onClick={handleClick} disabled={uploading}>
        {uploading ? uploadingLabel : `📁 ${label}`}
      </UploadBtn>

      {pickerOpen && (
        <Overlay onClick={() => setPickerOpen(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHead>
              <Tabs>
                <Tab type="button" active={tab === 'computer'} onClick={() => setTab('computer')}>{t.fromComputer}</Tab>
                <Tab type="button" active={tab === 'library'} onClick={() => setTab('library')}>{t.fromLibrary}</Tab>
              </Tabs>
              <CloseBtn type="button" onClick={() => setPickerOpen(false)} aria-label={t.close}>×</CloseBtn>
            </ModalHead>

            {tab === 'computer' ? (
              <DropZone type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading ? uploadingLabel : t.chooseFile}
              </DropZone>
            ) : (
              <MediaBrowser
                accept={accept}
                onPick={(item) => {
                  setPickerOpen(false);
                  onUploaded(item.url);
                }}
              />
            )}
          </Modal>
        </Overlay>
      )}
    </>
  );
}
