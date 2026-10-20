import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  SectionLabel,
  ScoringRow,
  ScoringLabel,
  ScoringInput,
  VerticalStackGap10,
} from '../styled';
import type { GameConfigHandle } from './types';

interface LuckyChickenGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

interface LuckyChickenScoring {
  durationSeconds: number;
  pointsPerCatch: number;
  badItemChancePercent: number;
  spawnIntervalMs: number;
  fallDurationMin: number;
  fallDurationMax: number;
}

const DEFAULTS: LuckyChickenScoring = {
  durationSeconds: 75,
  pointsPerCatch: 10,
  badItemChancePercent: 22,
  spawnIntervalMs: 900,
  fallDurationMin: 2800,
  fallDurationMax: 5200,
};

export default forwardRef<GameConfigHandle, LuckyChickenGameConfigProps>(
  function LuckyChickenGameConfig({ t, initialSettings }, ref) {
    const [cfg, setCfg] = useState<LuckyChickenScoring>(DEFAULTS);

    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      const storedChance = s.badItemChance as number | undefined;
      setCfg({
        durationSeconds: (s.durationSeconds as number) ?? DEFAULTS.durationSeconds,
        pointsPerCatch: (s.pointsPerCatch as number) ?? DEFAULTS.pointsPerCatch,
        badItemChancePercent: storedChance === undefined ? DEFAULTS.badItemChancePercent : Math.round(storedChance * 100),
        spawnIntervalMs: (s.spawnIntervalMs as number) ?? DEFAULTS.spawnIntervalMs,
        fallDurationMin: (s.fallDurationMin as number) ?? DEFAULTS.fallDurationMin,
        fallDurationMax: (s.fallDurationMax as number) ?? DEFAULTS.fallDurationMax,
      });
    }, [initialSettings]);

    useImperativeHandle(ref, () => ({
      getSettings: () => ({
        durationSeconds: cfg.durationSeconds,
        pointsPerCatch: cfg.pointsPerCatch,
        badItemChance: cfg.badItemChancePercent / 100,
        spawnIntervalMs: cfg.spawnIntervalMs,
        fallDurationMin: cfg.fallDurationMin,
        fallDurationMax: cfg.fallDurationMax,
      }),
      validate: () => (cfg.fallDurationMin >= cfg.fallDurationMax ? t.luckyChickenFallRangeError : null),
      fillRandom: () => {
        setCfg(DEFAULTS);
      },
    }));

    const set = (key: keyof LuckyChickenScoring) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (!isNaN(v)) setCfg(prev => ({ ...prev, [key]: v }));
    };

    return (
      <VerticalStackGap10>
        <SectionLabel>{t.luckyChickenSettings}</SectionLabel>

        <ScoringRow>
          <ScoringLabel>{t.luckyChickenDuration}</ScoringLabel>
          <ScoringInput type="number" min={10} max={300} value={cfg.durationSeconds} onChange={set('durationSeconds')} />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>{t.luckyChickenPointsPerCatch}</ScoringLabel>
          <ScoringInput type="number" min={1} max={1000} value={cfg.pointsPerCatch} onChange={set('pointsPerCatch')} />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>{t.luckyChickenBadChance}</ScoringLabel>
          <ScoringInput type="number" min={0} max={60} value={cfg.badItemChancePercent} onChange={set('badItemChancePercent')} />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>{t.luckyChickenSpawnInterval}</ScoringLabel>
          <ScoringInput type="number" min={300} max={3000} step={50} value={cfg.spawnIntervalMs} onChange={set('spawnIntervalMs')} />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>{t.luckyChickenFallMin}</ScoringLabel>
          <ScoringInput type="number" min={800} max={10000} step={100} value={cfg.fallDurationMin} onChange={set('fallDurationMin')} />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>{t.luckyChickenFallMax}</ScoringLabel>
          <ScoringInput type="number" min={800} max={10000} step={100} value={cfg.fallDurationMax} onChange={set('fallDurationMax')} />
        </ScoringRow>
      </VerticalStackGap10>
    );
  }
);
