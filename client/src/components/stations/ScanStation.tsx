import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import { StationContinueButton, DESKTOP_BREAKPOINT, DESKTOP_STATION_WIDTH, DesktopStationHeaderBand } from '../games/styled';
import { ModalOverlay, ModalCard } from '../styled';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ScanStation.i18n';
import { themedTitleInk } from '../../utils/themeInk';
import { participantSessionId } from '../../utils/participantActivity';
import { matchesScanCode, scanSettingsFrom } from '../../utils/scanCode';
import { createQrFrameReader } from '../../utils/qrFrameReader';
import ConfettiOverlay from './ConfettiOverlay';

const SCAN_INTERVAL_MS = 220;
const WRONG_CODE_NOTICE_MS = 2600;

const scanSweep = keyframes`
  0%   { top: 16%; }
  100% { top: 84%; }
`;

const Wrap = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '26px 16px 140px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  [DESKTOP_BREAKPOINT]: {
    width: '100%',
    padding: '32px 24px 180px',
  },
});

const Title = styled('h2')({
  margin: '0 0 16px',
  fontSize: 26,
  fontWeight: 800,
  color: '#fff',
  WebkitTextStroke: '1.5px #000',
  paintOrder: 'stroke fill',
  textAlign: 'center',
  paddingTop: 8,
  [DESKTOP_BREAKPOINT]: {
    margin: 0,
    paddingTop: 0,
    fontSize: 42,
    fontWeight: 700,
    color: '#111',
    WebkitTextStroke: '0',
  },
});

const Card = styled('div')({
  width: '100%',
  maxWidth: 330,
  background: '#fef3c7',
  border: '2px solid #333',
  borderRadius: 16,
  padding: '22px 20px 24px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 14,
  [DESKTOP_BREAKPOINT]: {
    maxWidth: DESKTOP_STATION_WIDTH,
    borderRadius: 32,
    padding: '32px 48px 40px',
  },
});

const Illustration = styled('img')({
  width: 132,
  height: 132,
});

const Instructions = styled('p')({
  margin: 0,
  fontSize: 19,
  fontWeight: 700,
  color: '#111',
  lineHeight: 1.45,
  textAlign: 'center',
  whiteSpace: 'pre-line',
  [DESKTOP_BREAKPOINT]: {
    fontSize: 24,
  },
});

const CameraFrame = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 330,
  aspectRatio: '1 / 1',
  background: '#111',
  border: '2px solid #333',
  borderRadius: 16,
  overflow: 'hidden',
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 420,
    borderRadius: 24,
  },
});

const CameraVideo = styled('video')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const cornerStyle = (vertical: 'top' | 'bottom', horizontal: 'left' | 'right') => ({
  position: 'absolute' as const,
  [vertical]: '14%',
  [horizontal]: '14%',
  width: 38,
  height: 38,
  borderColor: '#ffca28',
  borderStyle: 'solid',
  borderWidth: 0,
  [vertical === 'top' ? 'borderTopWidth' : 'borderBottomWidth']: 5,
  [horizontal === 'left' ? 'borderLeftWidth' : 'borderRightWidth']: 5,
  [`border${vertical === 'top' ? 'Top' : 'Bottom'}${horizontal === 'left' ? 'Left' : 'Right'}Radius`]: 12,
});

const CornerTopLeft = styled('div')(cornerStyle('top', 'left'));
const CornerTopRight = styled('div')(cornerStyle('top', 'right'));
const CornerBottomLeft = styled('div')(cornerStyle('bottom', 'left'));
const CornerBottomRight = styled('div')(cornerStyle('bottom', 'right'));

const ScanLine = styled('div')({
  position: 'absolute',
  left: '16%',
  right: '16%',
  height: 3,
  borderRadius: 2,
  background: '#ff4d3d',
  boxShadow: '0 0 12px #ff4d3d',
  animation: `${scanSweep} 1.8s ease-in-out infinite alternate`,
});

const CameraPill = styled('div')({
  position: 'absolute',
  left: 12,
  right: 12,
  padding: '8px 12px',
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 700,
  textAlign: 'center',
  color: '#fff',
});

const AimHint = styled(CameraPill)({
  bottom: 12,
  background: 'rgba(0, 0, 0, 0.6)',
});

const WrongNotice = styled(CameraPill)({
  top: 12,
  background: '#b91c1c',
  border: '2px solid #000',
});

const ManualToggle = styled('button')({
  marginTop: 14,
  background: 'none',
  border: 'none',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'underline',
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const ManualForm = styled('form')({
  width: '100%',
  maxWidth: 330,
  marginTop: 14,
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
});

const ManualInput = styled('input')({
  flex: 1,
  minWidth: 0,
  padding: '10px 12px',
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: 3,
  textAlign: 'center',
  textTransform: 'uppercase',
  direction: 'ltr',
  border: '2px solid #333',
  borderRadius: 10,
  background: '#fff',
  color: '#111',
  fontFamily: 'inherit',
  outline: 'none',
});

const ManualButton = styled('button')({
  padding: '10px 18px',
  fontSize: 16,
  fontWeight: 700,
  color: '#fff',
  background: '#6c5ce7',
  border: '2px solid #333',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const ErrorText = styled('div')({
  width: '100%',
  color: '#b91c1c',
  background: '#fff',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center',
  boxSizing: 'border-box',
});

const Row = styled('div')({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: 280,
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 427,
    bottom: 32,
  },
});

const PrimaryActionButton = styled(StationContinueButton)({
  width: '100%',
  maxWidth: 280,
});

const SecondaryActionButton = styled(StationContinueButton)({
  width: '100%',
  maxWidth: 280,
  fontSize: 18,
  padding: '14px 24px',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000',
  color: '#4c5b77',
  background: '#98aff1',
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
});

const RewardCard = styled(ModalCard)({
  textAlign: 'center',
  padding: '32px 28px 24px',
});

const RewardTitle = styled('h2')({
  margin: '0 0 10px',
  fontSize: 28,
  fontWeight: 800,
  color: '#111',
});

const RewardText = styled('p')({
  margin: '0 0 20px',
  fontSize: 16,
  color: '#444',
  lineHeight: 1.5,
  whiteSpace: 'pre-line',
});

const RewardImage = styled('img')({
  width: '100%',
  maxHeight: 280,
  objectFit: 'contain',
  borderRadius: 10,
  marginBottom: 20,
});

const RewardVideo = styled('video')({
  width: '100%',
  maxHeight: 280,
  borderRadius: 10,
  marginBottom: 20,
  background: '#000',
});

const RewardContinueButton = styled(StationContinueButton)({
  width: '100%',
  background: '#6c5ce7',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000',
  color: '#fff',
  fontSize: 18,
  padding: '14px 24px',
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
});

function readFound(key: string | undefined): boolean {
  if (!key) return false;
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFound(key: string | undefined, found: boolean) {
  if (!key) return;
  try {
    if (found) window.sessionStorage.setItem(key, '1');
    else window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

interface ScanStationProps {
  station: StationItemData;
  onContinue: () => void;
  code?: string;
  textColor?: string;
}

export default function ScanStation({ station, onContinue, code, textColor }: ScanStationProps) {
  const t = useTranslations(texts);
  const settings = useMemo(() => scanSettingsFrom(station.settings), [station.settings]);
  const foundKey = code ? `yooz_scan_${code}_${station._id}_${participantSessionId()}` : undefined;
  const [found, setFound] = useState(() => readFound(foundKey));
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [wrongCode, setWrongCode] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualWrong, setManualWrong] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFound = useCallback(() => {
    setCameraOpen(false);
    setFound(true);
    writeFound(foundKey, true);
  }, [foundKey]);

  const handleCameraFailed = useCallback(() => {
    setCameraOpen(false);
    setCameraError(true);
    setManualOpen(true);
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    let lastWrong = '';
    let lastWrongAt = 0;
    const reader = createQrFrameReader();

    const scanFrame = async () => {
      const video = videoRef.current;
      if (stopped || !video) return;
      const value = video.readyState >= 2 ? await reader.read(video) : null;
      if (stopped) return;
      if (value && matchesScanCode(value, settings.code)) {
        handleFound();
        return;
      }
      if (value && (value !== lastWrong || Date.now() - lastWrongAt > WRONG_CODE_NOTICE_MS)) {
        lastWrong = value;
        lastWrongAt = Date.now();
        setWrongCode(true);
      }
      timer = window.setTimeout(scanFrame, SCAN_INTERVAL_MS);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(async (media) => {
        stream = media;
        const video = videoRef.current;
        if (stopped || !video) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = media;
        await video.play().catch(() => undefined);
        scanFrame();
      })
      .catch(() => {
        if (!stopped) handleCameraFailed();
      });

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOpen, settings.code, handleFound, handleCameraFailed]);

  useEffect(() => {
    if (!wrongCode) return;
    const id = window.setTimeout(() => setWrongCode(false), WRONG_CODE_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [wrongCode]);

  const openCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      handleCameraFailed();
      return;
    }
    setCameraError(false);
    setCameraOpen(true);
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (matchesScanCode(manualValue, settings.code)) {
      handleFound();
      return;
    }
    setManualWrong(true);
  };

  const handleRewardContinue = () => {
    writeFound(foundKey, false);
    onContinue();
  };

  const rewardMedia = settings.rewardMediaUrl;

  return (
    <Wrap>
      <DesktopStationHeaderBand>
        <Title style={themedTitleInk(textColor)}>{settings.title || t.title}</Title>
      </DesktopStationHeaderBand>
      {cameraOpen ? (
        <CameraFrame>
          <CameraVideo ref={videoRef} playsInline muted autoPlay />
          <CornerTopLeft />
          <CornerTopRight />
          <CornerBottomLeft />
          <CornerBottomRight />
          <ScanLine />
          {wrongCode && <WrongNotice role="status">{t.wrongCode}</WrongNotice>}
          <AimHint>{t.aimHint}</AimHint>
        </CameraFrame>
      ) : (
        <Card>
          <Illustration src="/images/scan-qr.svg" alt="" />
          <Instructions>{settings.instructions || t.instructions}</Instructions>
          {cameraError && <ErrorText role="alert">{t.cameraError}</ErrorText>}
        </Card>
      )}
      {!cameraOpen && settings.code && (manualOpen ? (
        <ManualForm onSubmit={handleManualSubmit}>
          <ManualInput
            value={manualValue}
            placeholder={t.manualPlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={t.manualPlaceholder}
            onChange={(e) => {
              setManualValue(e.target.value);
              setManualWrong(false);
            }}
          />
          <ManualButton type="submit" disabled={!manualValue.trim()}>{t.manualSubmit}</ManualButton>
          {manualWrong && <ErrorText role="alert">{t.manualWrong}</ErrorText>}
        </ManualForm>
      ) : (
        <ManualToggle type="button" style={textColor ? { color: textColor } : undefined} onClick={() => setManualOpen(true)}>
          {t.manualToggle}
        </ManualToggle>
      ))}
      <Row>
        {!settings.code ? (
          <PrimaryActionButton type="button" onClick={onContinue}>{t.continue}</PrimaryActionButton>
        ) : cameraOpen ? (
          <SecondaryActionButton type="button" onClick={() => setCameraOpen(false)}>{t.closeCamera}</SecondaryActionButton>
        ) : (
          <PrimaryActionButton type="button" onClick={openCamera}>{t.openCamera}</PrimaryActionButton>
        )}
      </Row>
      {found && (
        <>
          <ConfettiOverlay />
          <ModalOverlay>
            <RewardCard onClick={(e) => e.stopPropagation()}>
              <RewardTitle>{settings.rewardTitle || t.rewardTitle}</RewardTitle>
              {settings.rewardText && <RewardText>{settings.rewardText}</RewardText>}
              {rewardMedia && settings.rewardType === 'image' && <RewardImage src={rewardMedia} alt="" />}
              {rewardMedia && settings.rewardType === 'video' && (
                <RewardVideo src={rewardMedia} autoPlay playsInline controls />
              )}
              <RewardContinueButton type="button" onClick={handleRewardContinue}>
                {settings.continueButtonText || t.continue}
              </RewardContinueButton>
            </RewardCard>
          </ModalOverlay>
        </>
      )}
    </Wrap>
  );
}
