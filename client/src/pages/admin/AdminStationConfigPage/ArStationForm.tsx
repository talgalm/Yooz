import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ArStationForm.i18n';
import FileUploadButton from '../../../components/FileUploadButton';
import { Input, SelectionButton } from '../../../components/styled';
import { SectionLabel, SectionLabelNoMargin, SectionDescription, SubLabel, VerticalStack, SelectionGroupWrap, SelectionSubtextSmall, InlineRowGap12, UrlInput } from '../styled';
import {
  AR_ALL_COINS_BONUS,
  AR_AREA_RADIUS_METERS,
  AR_COIN_COUNT,
  AR_FIND_POINTS,
  AR_POINTS_PER_COIN,
  AR_TIME_LIMIT_SECONDS,
  arHints,
  arScore,
  arSettingsFrom,
  hintsSettings,
  type ArHints,
  type ArHuntMode,
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

interface NumberInputProps {
  label: string;
  value: number;
  range: { min: number; max: number };
  allowZero?: boolean;
  onChange: (next: number) => void;
}

function NumberInput({ label, value, range, allowZero, onChange }: NumberInputProps) {
  return (
    <NumberField>
      <SubLabel>{label}</SubLabel>
      <Input
        type="number"
        min={range.min}
        max={range.max}
        value={allowZero ? String(value) : value || ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </NumberField>
  );
}

export default function ArStationForm({ value, onChange }: ArStationFormProps) {
  const t = useTranslations(texts);
  const update = (patch: Partial<ArStationSettings>) => onChange({ ...value, ...patch });
  const maxScore = arScore(0, arSettingsFrom(value)).maxPossibleScore;
  const suitcase = value.mode === 'suitcase';

  const modes: Array<[ArHuntMode, string, string]> = [
    ['coins', t.modeCoins, t.modeCoinsDesc],
    ['suitcase', t.modeSuitcase, t.modeSuitcaseDesc],
  ];
  const hintChoices: Array<[ArHints, string, string]> = [
    ['map', t.mapOn, t.mapOnDesc],
    ['hotCold', t.hotCold, t.hotColdDesc],
    ['none', t.mapOff, t.mapOffDesc],
  ];
  const hints = arHints(value);

  return (
    <VerticalStack>
      <SectionLabelNoMargin>{t.modeSection}</SectionLabelNoMargin>
      <SelectionGroupWrap>
        {modes.map(([mode, label, desc]) => (
          <SelectionButton key={mode} type="button" selected={value.mode === mode} onClick={() => update({ mode })}>
            <div>{label}</div>
            <SelectionSubtextSmall>{desc}</SelectionSubtextSmall>
          </SelectionButton>
        ))}
      </SelectionGroupWrap>

      <SectionLabel>{t.mapSection}</SectionLabel>
      <SelectionGroupWrap>
        {hintChoices.map(([choice, label, desc]) => (
          <SelectionButton key={choice} type="button" selected={hints === choice} onClick={() => update(hintsSettings(choice))}>
            <div>{label}</div>
            <SelectionSubtextSmall>{desc}</SelectionSubtextSmall>
          </SelectionButton>
        ))}
      </SelectionGroupWrap>

      <SectionLabel>{t.gameSection}</SectionLabel>
      <SectionDescription>{t.gameHelp}</SectionDescription>
      <NumberGrid>
        {!suitcase && <NumberInput label={t.coinCount} value={value.coinCount} range={AR_COIN_COUNT} onChange={(coinCount) => update({ coinCount })} />}
        <NumberInput label={t.timeLimit} value={value.timeLimitSeconds} range={AR_TIME_LIMIT_SECONDS} onChange={(timeLimitSeconds) => update({ timeLimitSeconds })} />
        <NumberInput label={t.areaRadius} value={value.areaRadiusMeters} range={AR_AREA_RADIUS_METERS} onChange={(areaRadiusMeters) => update({ areaRadiusMeters })} />
      </NumberGrid>

      <SectionLabel>{t.scoreSection}</SectionLabel>
      <NumberGrid>
        {suitcase ? (
          <NumberInput label={t.findPoints} value={value.findPoints} range={AR_FIND_POINTS} allowZero onChange={(findPoints) => update({ findPoints })} />
        ) : (
          <>
            <NumberInput label={t.pointsPerCoin} value={value.pointsPerCoin} range={AR_POINTS_PER_COIN} allowZero onChange={(pointsPerCoin) => update({ pointsPerCoin })} />
            <NumberInput label={t.allCoinsBonus} value={value.allCoinsBonus} range={AR_ALL_COINS_BONUS} allowZero onChange={(allCoinsBonus) => update({ allCoinsBonus })} />
          </>
        )}
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

      {suitcase && (
        <>
          <SectionLabel>{t.insideSection}</SectionLabel>
          <SectionDescription>{t.insideHelp}</SectionDescription>
          <TextArea
            placeholder={t.insideTextPlaceholder}
            value={value.insideText}
            onChange={(e) => update({ insideText: e.target.value })}
          />
          <InlineRowGap12>
            <FileUploadButton accept="image/*" onUploaded={(url) => update({ insideImageUrl: url })} />
            <UrlInput
              placeholder={t.insideImagePlaceholder}
              value={value.insideImageUrl}
              onChange={(e) => update({ insideImageUrl: e.target.value })}
            />
          </InlineRowGap12>
          <Input placeholder={t.insideCodePlaceholder} value={value.insideCode} onChange={(e) => update({ insideCode: e.target.value })} />
        </>
      )}
    </VerticalStack>
  );
}
