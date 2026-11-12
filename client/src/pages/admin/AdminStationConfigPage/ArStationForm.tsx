import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ArStationForm.i18n';
import { Input } from '../../../components/styled';
import { SectionLabel, SectionLabelNoMargin, SectionDescription, SubLabel, VerticalStack } from '../styled';
import {
  AR_ALL_COINS_BONUS,
  AR_AREA_RADIUS_METERS,
  AR_COIN_COUNT,
  AR_POINTS_PER_COIN,
  AR_TIME_LIMIT_SECONDS,
  arScore,
  arSettingsFrom,
  type ArStationSettings,
} from '../../../utils/arStation';

const NumberGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 12,
});

const NumberField = styled('label')({
  display: 'flex',
  flexDirection: 'column',
});

const ScoreSummary = styled('div')({
  alignSelf: 'flex-start',
  padding: '6px 14px',
  borderRadius: 999,
  background: '#ede7ff',
  color: '#5a2bd4',
  fontSize: 13,
  fontWeight: 700,
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

interface ArStationFormProps {
  value: ArStationSettings;
  onChange: (next: ArStationSettings) => void;
}

export default function ArStationForm({ value, onChange }: ArStationFormProps) {
  const t = useTranslations(texts);
  const update = (patch: Partial<ArStationSettings>) => onChange({ ...value, ...patch });
  const numberFrom = (raw: string) => (raw === '' ? 0 : Number(raw));
  const maxScore = arScore(0, arSettingsFrom(value)).maxPossibleScore;

  return (
    <VerticalStack>
      <SectionLabelNoMargin>{t.gameSection}</SectionLabelNoMargin>
      <SectionDescription>{t.gameHelp}</SectionDescription>
      <NumberGrid>
        <NumberField>
          <SubLabel>{t.coinCount}</SubLabel>
          <Input
            type="number"
            min={AR_COIN_COUNT.min}
            max={AR_COIN_COUNT.max}
            value={value.coinCount || ''}
            onChange={(e) => update({ coinCount: numberFrom(e.target.value) })}
          />
        </NumberField>
        <NumberField>
          <SubLabel>{t.timeLimit}</SubLabel>
          <Input
            type="number"
            min={AR_TIME_LIMIT_SECONDS.min}
            max={AR_TIME_LIMIT_SECONDS.max}
            value={value.timeLimitSeconds || ''}
            onChange={(e) => update({ timeLimitSeconds: numberFrom(e.target.value) })}
          />
        </NumberField>
        <NumberField>
          <SubLabel>{t.areaRadius}</SubLabel>
          <Input
            type="number"
            min={AR_AREA_RADIUS_METERS.min}
            max={AR_AREA_RADIUS_METERS.max}
            value={value.areaRadiusMeters || ''}
            onChange={(e) => update({ areaRadiusMeters: numberFrom(e.target.value) })}
          />
        </NumberField>
      </NumberGrid>

      <SectionLabel>{t.scoreSection}</SectionLabel>
      <NumberGrid>
        <NumberField>
          <SubLabel>{t.pointsPerCoin}</SubLabel>
          <Input
            type="number"
            min={AR_POINTS_PER_COIN.min}
            max={AR_POINTS_PER_COIN.max}
            value={String(value.pointsPerCoin)}
            onChange={(e) => update({ pointsPerCoin: numberFrom(e.target.value) })}
          />
        </NumberField>
        <NumberField>
          <SubLabel>{t.allCoinsBonus}</SubLabel>
          <Input
            type="number"
            min={AR_ALL_COINS_BONUS.min}
            max={AR_ALL_COINS_BONUS.max}
            value={String(value.allCoinsBonus)}
            onChange={(e) => update({ allCoinsBonus: numberFrom(e.target.value) })}
          />
        </NumberField>
      </NumberGrid>
      <ScoreSummary>{t.maxScore(maxScore)}</ScoreSummary>

      <SectionLabel>{t.screenSection}</SectionLabel>
      <Input placeholder={t.titlePlaceholder} value={value.title} onChange={(e) => update({ title: e.target.value })} />
      <TextArea
        placeholder={t.instructionsPlaceholder}
        value={value.instructions}
        onChange={(e) => update({ instructions: e.target.value })}
      />
      <TextArea
        placeholder={t.finishTextPlaceholder}
        value={value.finishText}
        onChange={(e) => update({ finishText: e.target.value })}
      />
    </VerticalStack>
  );
}
