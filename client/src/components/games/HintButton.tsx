import { OutlineButton } from '../styled';
import { HintButtonWrapper } from './styled';
import { styled } from '@mui/material/styles';

const SmallHintButton = styled(OutlineButton)({
  padding: '4px 16px',
  fontSize: 12,
  color: '#fff',
  background: '#6c5ce7',
  border: '2px solid #5143c6',
  boxShadow: '0 2px 0 #5143c6',
  '&:active': {
    background: '#5b4ed6',
    boxShadow: '0 1px 0 #5143c6',
    transform: 'translateY(1px)',
  },
});

interface HintButtonProps {
  hintUsed: boolean;
  useHintLabel: string;
  showHintLabel: string;
  onClick: () => void;
}

export default function HintButton({ hintUsed, useHintLabel, showHintLabel, onClick }: HintButtonProps) {
  return (
    <HintButtonWrapper>
      <SmallHintButton onClick={onClick}>
        {hintUsed ? showHintLabel : useHintLabel}
      </SmallHintButton>
    </HintButtonWrapper>
  );
}
