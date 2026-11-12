import { useRef } from 'react';
import { styled } from '@mui/material/styles';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ScanStationForm.i18n';
import FileUploadButton from '../../../components/FileUploadButton';
import { Input, SelectionButton } from '../../../components/styled';
import { SectionLabel, SectionLabelNoMargin, SectionDescription, InlineRowGap12, UrlInput, VerticalStack, SelectionGroupWrap } from '../styled';
import { newScanCode, scanPayload, type ScanRewardType, type ScanStationSettings } from '../../../utils/scanCode';

const DOWNLOAD_QR_SIZE = 1024;
const DOWNLOAD_CODE_BAND = 150;
const PREVIEW_QR_SIZE = 176;

const BarcodeRow = styled('div')({
  display: 'flex',
  gap: 20,
  alignItems: 'center',
  flexWrap: 'wrap',
});

const QrPreview = styled('div')({
  background: '#ffffff',
  border: '1px solid #d8dce5',
  borderRadius: 14,
  padding: '14px 14px 10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 6px 18px rgba(26, 26, 46, 0.08)',
  '& canvas': { display: 'block' },
});

const PreviewCode = styled('div')({
  fontSize: 20,
  fontWeight: 900,
  letterSpacing: 5,
  color: '#1a1a2e',
  direction: 'ltr',
});

const BarcodeActions = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flex: '0 1 380px',
  minWidth: 200,
});

const PlainActionButton = styled('button')({
  alignSelf: 'flex-start',
  padding: '10px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: '1px solid #d8dce5',
  background: '#ffffff',
  color: '#1a1a2e',
});

const PrimaryActionButton = styled(PlainActionButton)({
  border: '1px solid #6c5ce7',
  background: '#6c5ce7',
  color: '#ffffff',
});

const HiddenQr = styled('div')({
  display: 'none',
});

const TextArea = styled('textarea')({
  width: '100%',
  padding: '12px 14px',
  fontSize: 14,
  border: '1px solid #d8dce5',
  borderRadius: 10,
  outline: 'none',
  background: '#ffffff',
  color: '#1a1a2e',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: 80,
  boxSizing: 'border-box',
  '&:focus': { borderColor: '#6c5ce7' },
});

function qrWithCodeDataUrl(qr: HTMLCanvasElement, code: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = qr.width;
  canvas.height = qr.height + DOWNLOAD_CODE_BAND;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(qr, 0, 0);
  ctx.fillStyle = '#1a1a2e';
  ctx.font = '900 96px Rubik, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'ltr';
  ctx.fillText(code.split('').join(' '), canvas.width / 2, qr.height + 30);
  return canvas.toDataURL('image/png');
}

interface ScanStationFormProps {
  value: ScanStationSettings;
  onChange: (next: ScanStationSettings) => void;
  confirmBeforeNewCode: boolean;
}

export default function ScanStationForm({ value, onChange, confirmBeforeNewCode }: ScanStationFormProps) {
  const t = useTranslations(texts);
  const downloadQrRef = useRef<HTMLDivElement>(null);
  const update = (patch: Partial<ScanStationSettings>) => onChange({ ...value, ...patch });
  const payload = scanPayload(value.code);

  const handleDownload = () => {
    const canvas = downloadQrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = qrWithCodeDataUrl(canvas, value.code);
    if (!url) return;
    const link = document.createElement('a');
    link.download = `yooz-scan-${value.code}.png`;
    link.href = url;
    link.click();
  };

  const handleNewCode = () => {
    if (confirmBeforeNewCode && !window.confirm(t.regenerateConfirm)) return;
    update({ code: newScanCode() });
  };

  const rewardTypes: Array<[ScanRewardType, string]> = [
    ['message', t.rewardMessage],
    ['image', t.rewardImage],
    ['video', t.rewardVideo],
  ];

  return (
    <VerticalStack>
      <SectionLabelNoMargin>{t.barcodeSection}</SectionLabelNoMargin>
      <BarcodeRow>
        <QrPreview>
          <QRCodeCanvas value={payload} size={PREVIEW_QR_SIZE} level="H" marginSize={1} />
          <PreviewCode>{value.code}</PreviewCode>
        </QrPreview>
        <BarcodeActions>
          <SectionDescription>{t.barcodeHelp}</SectionDescription>
          <PrimaryActionButton type="button" onClick={handleDownload}>⬇ {t.download}</PrimaryActionButton>
          <PlainActionButton type="button" onClick={handleNewCode}>↻ {t.regenerate}</PlainActionButton>
        </BarcodeActions>
      </BarcodeRow>
      <HiddenQr ref={downloadQrRef}>
        <QRCodeCanvas value={payload} size={DOWNLOAD_QR_SIZE} level="H" marginSize={3} />
      </HiddenQr>

      <SectionLabel>{t.screenSection}</SectionLabel>
      <Input placeholder={t.titlePlaceholder} value={value.title} onChange={(e) => update({ title: e.target.value })} />
      <TextArea
        placeholder={t.instructionsPlaceholder}
        value={value.instructions}
        onChange={(e) => update({ instructions: e.target.value })}
      />

      <SectionLabel>{t.rewardSection}</SectionLabel>
      <SelectionGroupWrap>
        {rewardTypes.map(([type, label]) => (
          <SelectionButton
            key={type}
            type="button"
            selected={value.rewardType === type}
            onClick={() => update({ rewardType: type, rewardMediaUrl: type === value.rewardType ? value.rewardMediaUrl : '' })}
          >
            {label}
          </SelectionButton>
        ))}
      </SelectionGroupWrap>
      <Input
        placeholder={t.rewardTitlePlaceholder}
        value={value.rewardTitle}
        onChange={(e) => update({ rewardTitle: e.target.value })}
      />
      <TextArea
        placeholder={t.rewardTextPlaceholder}
        value={value.rewardText}
        onChange={(e) => update({ rewardText: e.target.value })}
      />
      {value.rewardType !== 'message' && (
        <InlineRowGap12>
          <FileUploadButton
            accept={value.rewardType === 'video' ? 'video/*' : 'image/*'}
            onUploaded={(url) => update({ rewardMediaUrl: url })}
          />
          <UrlInput
            placeholder={t.rewardMediaPlaceholder}
            value={value.rewardMediaUrl}
            onChange={(e) => update({ rewardMediaUrl: e.target.value })}
          />
        </InlineRowGap12>
      )}
      <Input
        placeholder={t.continuePlaceholder}
        value={value.continueButtonText}
        onChange={(e) => update({ continueButtonText: e.target.value })}
      />
    </VerticalStack>
  );
}
