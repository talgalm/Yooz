import { Component, ErrorInfo, ReactNode } from 'react';
import { styled } from '@mui/material/styles';
import { PrimaryButton, Title, PageContainer, CenteredContent } from './styled';

const ErrorTitle = styled(Title)({
  fontSize: 24,
  marginBottom: 12,
});

const ErrorMessage = styled('p')({
  marginBottom: 24,
  color: '#888',
  fontSize: 16,
  margin: '0 0 24px',
});

const RetryButton = styled(PrimaryButton)({
  maxWidth: 200,
});

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <PageContainer>
          <CenteredContent>
            <ErrorTitle>Something went wrong</ErrorTitle>
            <ErrorMessage>
              An unexpected error occurred. Please try again.
            </ErrorMessage>
            <RetryButton onClick={this.handleReset}>
              Try Again
            </RetryButton>
          </CenteredContent>
        </PageContainer>
      );
    }

    return this.props.children;
  }
}
