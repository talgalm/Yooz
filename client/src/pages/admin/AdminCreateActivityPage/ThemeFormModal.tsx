import { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';

export interface CustomTheme {
  _id: string;
  name: string;
  mainColor: string;
  roadmapImage?: string;
  stationsImage?: string;
  textColor?: string;
  bgColor?: string;
  roadmapActiveNodeColor?: string;
  roadmapPathColor?: string;
  headerIconColor?: string;
  /** Lowercased; a customer may only edit or delete themes they created. */
  createdByEmail?: string;
}

// ─── Styled ───

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
  maxWidth: 440,
  // The form is taller than a laptop screen: cap the modal and let ModalBody
  // scroll, so the title and the save/cancel buttons always stay in view.
  maxHeight: '90dvh',
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

const ModalBody = styled('div')({
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  // Keep the fields off the scrollbar (on the left, in RTL).
  paddingInlineEnd: 6,
});

const Field = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
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
  '&:focus': {
    borderColor: '#6c5ce7',
  },
});

const ColorRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
});

const ColorSwatch = styled('div')<{ color: string }>(({ color }) => ({
  width: 38,
  height: 38,
  borderRadius: 8,
  border: '2px solid #e0e0e0',
  background: color,
  flexShrink: 0,
  cursor: 'pointer',
  overflow: 'hidden',
  position: 'relative',
}));

const ColorInput = styled('input')({
  position: 'absolute',
  inset: 0,
  opacity: 0,
  width: '100%',
  height: '100%',
  cursor: 'pointer',
  border: 'none',
  padding: 0,
});

const ImageRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
});

const ImageThumb = styled('img')({
  width: 40,
  height: 40,
  borderRadius: 6,
  objectFit: 'cover',
  border: '1px solid #e0e0e0',
  flexShrink: 0,
});

const ClearBtn = styled('button')({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  color: '#bbb',
  padding: '0 4px',
  lineHeight: 1,
  '&:hover': { color: '#e74c3c' },
});

const Actions = styled('div')({
  display: 'flex',
  gap: 10,
  justifyContent: 'flex-end',
  marginTop: 4,
});

const SaveBtn = styled('button')({
  padding: '10px 24px',
  background: '#6c5ce7',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
  '&:hover:not(:disabled)': { background: '#5b4cd4' },
});

const CancelBtn = styled('button')({
  padding: '10px 20px',
  background: '#f5f5f7',
  color: '#555',
  fontWeight: 600,
  fontSize: 14,
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#ececf4' },
});

// ─── Component ───

interface Props {
  existing?: CustomTheme | null;
  onSaved: (theme: CustomTheme) => void;
  onClose: () => void;
}

export default function ThemeFormModal({ existing, onSaved, onClose }: Props) {
  const isEdit = Boolean(existing);

  const [name, setName] = useState(existing?.name ?? '');
  const [mainColor, setMainColor] = useState(existing?.mainColor ?? '#6c5ce7');
  const [roadmapImage, setRoadmapImage] = useState(existing?.roadmapImage ?? '');
  const [stationsImage, setStationsImage] = useState(existing?.stationsImage ?? '');
  const [textColor, setTextColor] = useState(existing?.textColor ?? '#111111');
  const [bgColor, setBgColor] = useState(existing?.bgColor ?? '#8fb248');
  const [roadmapActiveNodeColor, setRoadmapActiveNodeColor] = useState(existing?.roadmapActiveNodeColor ?? '');
  const [roadmapPathColor, setRoadmapPathColor] = useState(existing?.roadmapPathColor ?? '');
  const [headerIconColor, setHeaderIconColor] = useState(existing?.headerIconColor ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync hex input ↔ color picker
  const [hexInput, setHexInput] = useState(existing?.mainColor ?? '#6c5ce7');
  useEffect(() => { setHexInput(mainColor); }, [mainColor]);
  const [textHexInput, setTextHexInput] = useState(existing?.textColor ?? '#111111');
  useEffect(() => { setTextHexInput(textColor); }, [textColor]);
  const [bgHexInput, setBgHexInput] = useState(existing?.bgColor ?? '#8fb248');
  useEffect(() => { setBgHexInput(bgColor); }, [bgColor]);
  const [roadmapActiveNodeHexInput, setRoadmapActiveNodeHexInput] = useState(existing?.roadmapActiveNodeColor ?? '');
  useEffect(() => { setRoadmapActiveNodeHexInput(roadmapActiveNodeColor); }, [roadmapActiveNodeColor]);
  const [roadmapPathHexInput, setRoadmapPathHexInput] = useState(existing?.roadmapPathColor ?? '');
  useEffect(() => { setRoadmapPathHexInput(roadmapPathColor); }, [roadmapPathColor]);
  const [headerIconHexInput, setHeaderIconHexInput] = useState(existing?.headerIconColor ?? '');
  useEffect(() => { setHeaderIconHexInput(headerIconColor); }, [headerIconColor]);

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setMainColor(val);
  };
  const handleTextHexInput = (val: string) => {
    setTextHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setTextColor(val);
  };
  const handleBgHexInput = (val: string) => {
    setBgHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setBgColor(val);
  };
  const handleRoadmapActiveNodeHexInput = (val: string) => {
    setRoadmapActiveNodeHexInput(val);
    if (!val) {
      setRoadmapActiveNodeColor('');
      return;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setRoadmapActiveNodeColor(val);
  };
  const handleRoadmapPathHexInput = (val: string) => {
    setRoadmapPathHexInput(val);
    if (!val) {
      setRoadmapPathColor('');
      return;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setRoadmapPathColor(val);
  };
  const handleHeaderIconHexInput = (val: string) => {
    setHeaderIconHexInput(val);
    if (!val) {
      setHeaderIconColor('');
      return;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setHeaderIconColor(val);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('שם הערכה הוא שדה חובה'); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(mainColor)) { setError('צבע לא תקין — נדרש קוד hex כמו #ff6b6b'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: name.trim(),
        mainColor,
        roadmapImage: roadmapImage || undefined,
        stationsImage: stationsImage || undefined,
        textColor,
        bgColor,
        roadmapActiveNodeColor: roadmapActiveNodeColor || undefined,
        roadmapPathColor: roadmapPathColor || undefined,
        headerIconColor: headerIconColor || undefined,
      };
      let result: { theme: CustomTheme };
      if (isEdit && existing) {
        result = await adminApiFetch<{ theme: CustomTheme }>(`/api/admin/themes/${existing._id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        result = await adminApiFetch<{ theme: CustomTheme }>('/api/admin/themes', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      onSaved(result.theme);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Backdrop onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Modal>
        <ModalTitle>{isEdit ? 'עריכת ערכת עיצוב' : 'ערכת עיצוב חדשה'}</ModalTitle>

        <ModalBody>
          <Field>
            <FieldLabel>שם הערכה *</FieldLabel>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: חג המולד" />
          </Field>

          <Field>
            <FieldLabel>צבע ראשי *</FieldLabel>
            <ColorRow>
              <ColorSwatch color={mainColor}>
                <ColorInput type="color" value={mainColor} onChange={(e) => setMainColor(e.target.value)} />
              </ColorSwatch>
              <TextInput
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#6c5ce7"
                style={{ width: 120 }}
              />
            </ColorRow>
          </Field>

          <Field>
            <FieldLabel>צבע טקסט תחנות</FieldLabel>
            <ColorRow>
              <ColorSwatch color={textColor}>
                <ColorInput type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              </ColorSwatch>
              <TextInput
                value={textHexInput}
                onChange={(e) => handleTextHexInput(e.target.value)}
                placeholder="#111111"
                style={{ width: 120 }}
              />
            </ColorRow>
          </Field>

          <Field>
            <FieldLabel>צבע רקע דפדפן (מסלול + תחנות)</FieldLabel>
            <ColorRow>
              <ColorSwatch color={bgColor}>
                <ColorInput type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              </ColorSwatch>
              <TextInput
                value={bgHexInput}
                onChange={(e) => handleBgHexInput(e.target.value)}
                placeholder="#8fb248"
                style={{ width: 120 }}
              />
            </ColorRow>
          </Field>

          <Field>
            <FieldLabel>צבע עיגול תחנה/משחק פעיל במסלול (אופציונלי)</FieldLabel>
            <ColorRow>
              <ColorSwatch color={roadmapActiveNodeColor || '#d4e84e'}>
                <ColorInput
                  type="color"
                  value={roadmapActiveNodeColor || '#d4e84e'}
                  onChange={(e) => setRoadmapActiveNodeColor(e.target.value)}
                />
              </ColorSwatch>
              <TextInput
                value={roadmapActiveNodeHexInput}
                onChange={(e) => handleRoadmapActiveNodeHexInput(e.target.value)}
                placeholder="default: nature"
                style={{ width: 160 }}
              />
              {roadmapActiveNodeColor && <ClearBtn type="button" title="נקה צבע" onClick={() => setRoadmapActiveNodeColor('')}>×</ClearBtn>}
            </ColorRow>
          </Field>

          <Field>
            <FieldLabel>צבע המסלול (אופציונלי)</FieldLabel>
            <ColorRow>
              <ColorSwatch color={roadmapPathColor || '#3A291A'}>
                <ColorInput
                  type="color"
                  value={roadmapPathColor || '#3A291A'}
                  onChange={(e) => setRoadmapPathColor(e.target.value)}
                />
              </ColorSwatch>
              <TextInput
                value={roadmapPathHexInput}
                onChange={(e) => handleRoadmapPathHexInput(e.target.value)}
                placeholder="default: nature"
                style={{ width: 160 }}
              />
              {roadmapPathColor && <ClearBtn type="button" title="נקה צבע" onClick={() => setRoadmapPathColor('')}>×</ClearBtn>}
            </ColorRow>
          </Field>

          <Field>
            <FieldLabel>צבע אייקונים בכותרת (אופציונלי)</FieldLabel>
            <ColorRow>
              <ColorSwatch color={headerIconColor || '#ffffff'}>
                <ColorInput
                  type="color"
                  value={headerIconColor || '#ffffff'}
                  onChange={(e) => setHeaderIconColor(e.target.value)}
                />
              </ColorSwatch>
              <TextInput
                value={headerIconHexInput}
                onChange={(e) => handleHeaderIconHexInput(e.target.value)}
                placeholder="default: white"
                style={{ width: 160 }}
              />
              {headerIconColor && <ClearBtn type="button" title="נקה צבע" onClick={() => setHeaderIconColor('')}>×</ClearBtn>}
            </ColorRow>
          </Field>

          <Field>
            <FieldLabel>תמונת רקע למסלול (אופציונלי)</FieldLabel>
            <ImageRow>
              {roadmapImage && <ImageThumb src={roadmapImage} alt="" />}
              <FileUploadButton accept="image/*" onUploaded={setRoadmapImage} label="העלה תמונה" uploadingLabel="מעלה..." />
              {roadmapImage && <ClearBtn type="button" title="הסר תמונה" onClick={() => setRoadmapImage('')}>×</ClearBtn>}
            </ImageRow>
            {roadmapImage && (
              <input
                value={roadmapImage}
                onChange={(e) => setRoadmapImage(e.target.value)}
                placeholder="או הדביקו כתובת תמונה..."
                style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, width: '100%', boxSizing: 'border-box' }}
              />
            )}
          </Field>

          <Field>
            <FieldLabel>תמונת רקע לתחנות (אופציונלי)</FieldLabel>
            <ImageRow>
              {stationsImage && <ImageThumb src={stationsImage} alt="" />}
              <FileUploadButton accept="image/*" onUploaded={setStationsImage} label="העלה תמונה" uploadingLabel="מעלה..." />
              {stationsImage && <ClearBtn type="button" title="הסר תמונה" onClick={() => setStationsImage('')}>×</ClearBtn>}
            </ImageRow>
            {stationsImage && (
              <input
                value={stationsImage}
                onChange={(e) => setStationsImage(e.target.value)}
                placeholder="או הדביקו כתובת תמונה..."
                style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, width: '100%', boxSizing: 'border-box' }}
              />
            )}
          </Field>
        </ModalBody>

        {error && <div style={{ color: '#e74c3c', fontSize: 13 }}>{error}</div>}

        <Actions>
          <CancelBtn type="button" onClick={onClose}>ביטול</CancelBtn>
          <SaveBtn type="button" disabled={saving} onClick={handleSave}>
            {saving ? 'שומר...' : 'שמור ערכה'}
          </SaveBtn>
        </Actions>
      </Modal>
    </Backdrop>
  );
}
