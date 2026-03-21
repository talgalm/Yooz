import { useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { adminUploadFile } from '../utils/adminApi';

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

interface FileUploadButtonProps {
  /** Accepted file types, e.g. "image/*", "video/*", "image/*,video/*" */
  accept: string;
  /** Called with the uploaded file URL on success */
  onUploaded: (url: string) => void;
  /** Button label */
  label?: string;
  /** Uploading label */
  uploadingLabel?: string;
}

export default function FileUploadButton({ accept, onUploaded, label = 'Upload', uploadingLabel = 'Uploading...' }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await adminUploadFile(file);
      onUploaded(result.url);
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
    </>
  );
}
