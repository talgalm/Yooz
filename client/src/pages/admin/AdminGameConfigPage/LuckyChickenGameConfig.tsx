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
  badItemChance: number;
  spawnIntervalMs: number;
  fallDurationMin: number;
  fallDurationMax: number;
}

const DEFAULTS: LuckyChickenScoring = {
  durationSeconds: 75,
  pointsPerCatch: 10,
  badItemChance: 22,  // stored as percent 0-100, divided by 100 on read
  spawnIntervalMs: 900,
  fallDurationMin: 2800,
  fallDurationMax: 5200,
};

export default forwardRef<GameConfigHandle, LuckyChickenGameConfigProps>(
  function LuckyChickenGameConfig({ initialSettings }, ref) {
    const [cfg, setCfg] = useState<LuckyChickenScoring>(DEFAULTS);

    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      setCfg({
        durationSeconds:  (s.durationSeconds  as number) ?? DEFAULTS.durationSeconds,
        pointsPerCatch:   (s.pointsPerCatch   as number) ?? DEFAULTS.pointsPerCatch,
        badItemChance:    Math.round(((s.badItemChance as number) ?? DEFAULTS.badItemChance / 100) * 100),
        spawnIntervalMs:  (s.spawnIntervalMs  as number) ?? DEFAULTS.spawnIntervalMs,
        fallDurationMin:  (s.fallDurationMin  as number) ?? DEFAULTS.fallDurationMin,
        fallDurationMax:  (s.fallDurationMax  as number) ?? DEFAULTS.fallDurationMax,
      });
    }, [initialSettings]);

    useImperativeHandle(ref, () => ({
      getSettings: () => ({
        durationSeconds: cfg.durationSeconds,
        pointsPerCatch:  cfg.pointsPerCatch,
        badItemChance:   cfg.badItemChance / 100,
        spawnIntervalMs: cfg.spawnIntervalMs,
        fallDurationMin: cfg.fallDurationMin,
        fallDurationMax: cfg.fallDurationMax,
      }),
      validate: () => {
        if (cfg.fallDurationMin >= cfg.fallDurationMax) {
          return 'Fall speed min must be less than max';
        }
        return null;
      },
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
        <SectionLabel>Lucky Chicken Settings</SectionLabel>

        <ScoringRow>
          <ScoringLabel>Game Duration (seconds)</ScoringLabel>
          <ScoringInput
            type="number"
            min={10}
            max={300}
            value={cfg.durationSeconds}
            onChange={set('durationSeconds')}
          />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>Points per catch</ScoringLabel>
          <ScoringInput
            type="number"
            min={1}
            max={1000}
            value={cfg.pointsPerCatch}
            onChange={set('pointsPerCatch')}
          />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>Burnt chicken chance (% of spawns, 0–100)</ScoringLabel>
          <ScoringInput
            type="number"
            min={0}
            max={60}
            value={cfg.badItemChance}
            onChange={set('badItemChance')}
          />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>Spawn interval (ms between items)</ScoringLabel>
          <ScoringInput
            type="number"
            min={300}
            max={3000}
            step={50}
            value={cfg.spawnIntervalMs}
            onChange={set('spawnIntervalMs')}
          />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>Fall speed min (ms to reach bottom, lower = faster)</ScoringLabel>
          <ScoringInput
            type="number"
            min={800}
            max={10000}
            step={100}
            value={cfg.fallDurationMin}
            onChange={set('fallDurationMin')}
          />
        </ScoringRow>

        <ScoringRow>
          <ScoringLabel>Fall speed max (ms to reach bottom)</ScoringLabel>
          <ScoringInput
            type="number"
            min={800}
            max={10000}
            step={100}
            value={cfg.fallDurationMax}
            onChange={set('fallDurationMax')}
          />
        </ScoringRow>
      </VerticalStackGap10>
    );
  }
);
