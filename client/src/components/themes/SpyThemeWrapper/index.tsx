import { ReactNode } from 'react';
import {
  SpyFrame,
  SpyContent,
  CornerTL,
  CornerTR,
  CornerBL,
  CornerBR,
  HudOverlay,
  HudText,
  HudRow,
  Scanline,
  BatteryIcon,
  BatteryBody,
  BatteryTip,
} from './styled';

interface SpyThemeWrapperProps {
  children: ReactNode;
}

export default function SpyThemeWrapper({ children }: SpyThemeWrapperProps) {
  return (
    <SpyFrame>
      <CornerTL />
      <CornerTR />
      <CornerBL />
      <CornerBR />
      <Scanline />
      <HudOverlay>
        <HudRow>
          <HudText>14 L</HudText>
        </HudRow>
        <HudRow>
          <BatteryIcon>
            <BatteryBody />
            <BatteryTip />
          </BatteryIcon>
          <HudText>00:00:01:00</HudText>
        </HudRow>
      </HudOverlay>
      <SpyContent>
        {children}
      </SpyContent>
    </SpyFrame>
  );
}
